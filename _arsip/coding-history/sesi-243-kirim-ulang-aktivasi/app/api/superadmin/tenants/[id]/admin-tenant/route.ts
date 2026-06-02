// app/api/superadmin/tenants/[id]/admin-tenant/route.ts
// API route: Manajemen AdminTenant per tenant.
// Endpoint:
//   GET    /api/superadmin/tenants/[id]/admin-tenant        → getTabData (daftar aktif + riwayat)
//   POST   /api/superadmin/tenants/[id]/admin-tenant        → tambah AT (baru atau existing)
//   PATCH  /api/superadmin/tenants/[id]/admin-tenant        → edit data AT in-place (F-REQ-12)
//   DELETE /api/superadmin/tenants/[id]/admin-tenant        → cabut akses AT (F-REQ-14)
//
// Auth: requireSuperAdmin() — server-only, wajib sebelum semua handler
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2
// Fix S#240: params → Promise<{id}> (Next.js 16 App Router pattern)
// Referensi: TDD_AT_AUTH_v1.md Section 5.4

import 'server-only'
import { NextResponse }      from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-server'
import {
  getTabData,
  cekEmail,
  tambahAdminTenantExisting,
  editAdminTenantProfile,
  cabutAkses,
} from '@/lib/services/admin-tenant.service'
import { tambahAdminTenantBaru } from '@/lib/services/admin-tenant-create.service'
import type {
  TambahAdminTenantPayload,
  TambahAdminTenantExistingPayload,
  EditAdminTenantPayload,
  CabutAksesAdminTenantPayload,
} from '@/lib/types/admin-tenant.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — Ambil data Tab AdminTenant ────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const data = await getTabData(id)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[admin-tenant/route GET]', err)
    return NextResponse.json({ success: false, error: 'Gagal memuat data AdminTenant' }, { status: 500 })
  }
}

// ─── POST — Tambah AdminTenant ────────────────────────────────────────────────
// Body JSON:
//   action: 'cek_email'           → gerbang F-REQ-03 (cek sebelum submit)
//   action: 'tambah_baru'         → F-REQ-01 (email belum terdaftar)
//   action: 'tambah_existing'     → F-REQ-05 (aksi YES saat email sudah terdaftar)
//   action: 'kirim_ulang_aktivasi'→ Kirim ulang email aktivasi (K-30 Jalur 1)

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body tidak valid' }, { status: 400 })
  }

  const { id: tenantId } = await params
  const saUserId = auth.uid

  // ── Gerbang: cek email (F-REQ-03) ────────────────────────────────────────
  if (body.action === 'cek_email') {
    const email = String(body.email ?? '').toLowerCase().trim()
    if (!email) return NextResponse.json({ success: false, error: 'Email wajib diisi' }, { status: 400 })

    const result = await cekEmail(email, tenantId)
    return NextResponse.json({ success: true, data: result })
  }

  // ── Tambah AT baru (F-REQ-01) ─────────────────────────────────────────────
  if (body.action === 'tambah_baru') {
    const payload = body.payload as TambahAdminTenantPayload
    if (!payload?.email || !payload?.nama || !payload?.jabatan) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 })
    }

    const tenantNama = String(body.tenant_nama ?? '')
    const result = await tambahAdminTenantBaru({ ...payload, tenant_id: tenantId }, saUserId, tenantNama)

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 })
    }
    return NextResponse.json({ success: true, data: { emailTerkirim: result.emailTerkirim } })
  }

  // ── Tambah AT existing (F-REQ-05) ────────────────────────────────────────
  if (body.action === 'tambah_existing') {
    const payload = body.payload as TambahAdminTenantExistingPayload
    if (!payload?.user_id || !payload?.jabatan) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 })
    }

    const result = await tambahAdminTenantExisting({ ...payload, tenant_id: tenantId }, saUserId)

    if (!result.ok) {
      const status = result.error === 'at_error_email_sudah_aktif_tenant' ? 409 : 422
      return NextResponse.json({ success: false, error: result.error }, { status })
    }
    return NextResponse.json({ success: true })
  }

  // ── Kirim ulang email aktivasi (K-30 Jalur 1) ────────────────────────────
  if (body.action === 'kirim_ulang_aktivasi') {
    const userId     = String(body.user_id ?? '').trim()
    const tenantNama = String(body.tenant_nama ?? '')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'user_id wajib diisi' }, { status: 400 })
    }

    const { kirimUlangAktivasi } = await import('@/lib/services/admin-tenant-create.service')
    const result = await kirimUlangAktivasi(userId, tenantNama)

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 })
    }
    return NextResponse.json({ success: true, data: { emailTerkirim: result.emailTerkirim } })
  }

  return NextResponse.json({ success: false, error: 'Action tidak dikenali' }, { status: 400 })
}

// ─── PATCH — Edit Data AdminTenant In-Place (F-REQ-12) ───────────────────────

export async function PATCH(
  request: Request,
  { params: _params }: RouteContext
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  let body: EditAdminTenantPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body tidak valid' }, { status: 400 })
  }

  if (!body.history_id || !body.user_name) {
    return NextResponse.json({ success: false, error: 'history_id dan user_name wajib diisi' }, { status: 400 })
  }

  const result = await editAdminTenantProfile(body, auth.uid)
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 422 })
  return NextResponse.json({ success: true })
}

// ─── DELETE — Cabut Akses AdminTenant (F-REQ-14) ─────────────────────────────

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  let body: CabutAksesAdminTenantPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body tidak valid' }, { status: 400 })
  }

  if (!body.history_id || !body.alasan) {
    return NextResponse.json({ success: false, error: 'history_id dan alasan wajib diisi' }, { status: 400 })
  }

  const { id: tenantId } = await params
  const result = await cabutAkses({ ...body, tenant_id: tenantId }, auth.uid)
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 422 })
  return NextResponse.json({ success: true })
}
