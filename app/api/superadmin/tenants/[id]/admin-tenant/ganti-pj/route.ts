// app/api/superadmin/tenants/[id]/admin-tenant/ganti-pj/route.ts
// API route: Ganti Penanggung Jawab tenant (F-REQ-10 — orang berbeda).
// Endpoint:
//   POST /api/superadmin/tenants/[id]/admin-tenant/ganti-pj
//
// Alur: tutup baris history lama → tetapkan AT baru (buat akun jika perlu)
// Auth: requireSuperAdmin()
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2
// Fix S#240: params → Promise<{id}> (Next.js 16 App Router pattern)
// Referensi: TDD_AT_AUTH_v1.md Section 5.4, FSD_AT_AUTH_v1.md Alur 10, SP sp_ganti_penanggung_jawab

import 'server-only'
import { NextResponse }      from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { tambahAdminTenantBaru } from '@/lib/services/admin-tenant-create.service'
import { tambahAdminTenantExisting } from '@/lib/services/admin-tenant.service'
import type { GantiPenanggungJawabPayload } from '@/lib/types/admin-tenant.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST — Ganti Penanggung Jawab (F-REQ-10) ────────────────────────────────
// Body JSON: GantiPenanggungJawabPayload + tenant_nama (untuk email aktivasi)
//
// Urutan:
//   1. Tutup baris PJ lama via sp_ganti_penanggung_jawab (atomik: ended_at + baris baru)
//   2. Jika email_is_new = true → tambahAdminTenantBaru
//      Jika email_is_new = false → tambahAdminTenantExisting
//   3. SP sp_ganti_penanggung_jawab menangani update kontak tenant (KP-02)

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  let body: GantiPenanggungJawabPayload & {
    tenant_nama:  string
    email_is_new: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body tidak valid' }, { status: 400 })
  }

  const { id: tenantId } = await params
  const saUserId = auth.uid

  if (!body.new_user_id || !body.new_user_name || !body.alasan_pergantian) {
    return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 })
  }

  const db = createServerSupabaseClient()

  // Eksekusi SP sp_ganti_penanggung_jawab (atomik: tutup PJ lama + buka PJ baru di history)
  const { error: spError } = await db.rpc('sp_ganti_penanggung_jawab', {
    p_tenant_id:          tenantId,
    p_new_user_id:        body.new_user_id,
    p_new_user_name:      body.new_user_name,
    p_new_user_email:     body.new_user_email,
    p_new_user_wa:        body.new_user_wa,
    p_new_jabatan:        body.new_jabatan,
    p_new_relasi:         body.new_relasi,
    p_alasan_pergantian:  body.alasan_pergantian,
    p_tanggal_efektif:    body.tanggal_efektif,
    p_catatan:            body.catatan ?? null,
    p_changed_by:         saUserId,
  })

  if (spError) {
    console.error('[ganti-pj/route POST] sp_ganti_penanggung_jawab gagal:', spError)
    return NextResponse.json(
      { success: false, error: `Gagal ganti penanggung jawab: ${spError.message}` },
      { status: 422 }
    )
  }

  // Buat/assign akun untuk PJ baru jika belum ada membership di tenant ini
  let emailTerkirim = false

  if (body.email_is_new) {
    const result = await tambahAdminTenantBaru(
      {
        tenant_id:            tenantId,
        nama:                 body.new_user_name,
        email:                body.new_user_email,
        nomor_wa:             body.new_user_wa,
        jabatan:              body.new_jabatan,
        relasi_ke_perusahaan: body.new_relasi,
      },
      saUserId,
      body.tenant_nama
    )

    if (!result.ok) {
      console.error('[ganti-pj/route POST] tambahAdminTenantBaru gagal setelah SP:', result.error)
      return NextResponse.json({
        success: true,
        warning: `Ganti PJ berhasil tetapi akun baru gagal dibuat: ${result.error}`,
        emailTerkirim: false,
      })
    }
    emailTerkirim = result.emailTerkirim
  } else {
    const result = await tambahAdminTenantExisting(
      {
        tenant_id:            tenantId,
        user_id:              body.new_user_id,
        jabatan:              body.new_jabatan,
        relasi_ke_perusahaan: body.new_relasi,
      },
      saUserId
    )

    if (!result.ok && result.error !== 'at_error_email_sudah_aktif_tenant') {
      console.error('[ganti-pj/route POST] tambahAdminTenantExisting gagal:', result.error)
    }
  }

  return NextResponse.json({ success: true, data: { emailTerkirim } })
}
