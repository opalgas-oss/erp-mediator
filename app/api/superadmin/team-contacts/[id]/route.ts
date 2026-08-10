// app/api/superadmin/team-contacts/[id]/route.ts
// PATCH  — Ubah satu kontak, ATAU geser prioritasnya satu langkah (aksi dibedakan di body)
// DELETE — Hapus lunak satu kontak
// Hanya SuperAdmin.
//
// Dibuat: Sesi #423 — Direktori Kontak Tim Tahap A, FASE 3.5
//
// Layer Route. NOL logika bisnis di sini — penukaran sort_order, aturan jabatan, dan
// konsistensi scope semuanya di team-contact.service.ts.
//
// Kenapa "geser" ikut di PATCH, bukan endpoint tersendiri: menggeser prioritas adalah
// perubahan atas SATU sumber daya yang sama (kontak ini), dan Zod discriminated union
// membuat kedua bentuk body tervalidasi ketat tanpa menambah permukaan route baru.

import { NextRequest, NextResponse } from 'next/server'
import { z }                        from 'zod'
import { requireSuperAdmin }        from '@/lib/auth-server'
import {
  TeamContactService_update,
  TeamContactService_delete,
  TeamContactService_geser,
} from '@/lib/services/team-contact.service'

// ─── DTO Zod ──────────────────────────────────────────────────────────────────

const JabatanEnum = z.enum([
  'penanggung_jawab',
  'operator',
  'finance',
  'warehouse',
  'sales',
  'lainnya',
])

const UbahSchema = z.object({
  aksi:                  z.literal('ubah'),
  nama:                  z.string().trim().min(1, 'Nama tidak boleh kosong').max(150).optional(),
  email:                 z.string().trim().email('Format email tidak valid').max(255).optional(),
  telepon:               z.string().trim().max(30).nullable().optional(),
  jabatan:               JabatanEnum.optional(),
  publish_bug_dashboard:          z.boolean().optional(),
  publish_dashboard_admin_tenant: z.boolean().optional(),
  publish_public_website:         z.boolean().optional(),
  is_active:             z.boolean().optional(),
})

const GeserSchema = z.object({
  aksi: z.literal('geser'),
  arah: z.enum(['naik', 'turun']),
})

const PatchSchema = z.discriminatedUnion('aksi', [UbahSchema, GeserSchema])

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID kontak wajib diisi' }, { status: 400 })
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch (errParse) {
      console.warn('[PATCH /api/superadmin/team-contacts/[id]] body bukan JSON valid:', errParse)
      return NextResponse.json(
        { success: false, message: 'Body permintaan bukan JSON yang valid' },
        { status: 400 }
      )
    }

    const parsed = PatchSchema.safeParse(raw)
    if (!parsed.success) {
      const pesan = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`)
        .join(' · ')
      return NextResponse.json({ success: false, message: pesan }, { status: 400 })
    }

    // ── Cabang GESER: menyentuh 2 baris (keputusan mockup S#421 #2) ──
    if (parsed.data.aksi === 'geser') {
      const berubah = await TeamContactService_geser(
        { id, arah: parsed.data.arah },
        auth.uid,
        'super_admin',
        null
      )
      return NextResponse.json({
        success: true,
        berubah,
        message: berubah
          ? 'Prioritas kontak berhasil digeser'
          : 'Kontak sudah berada di ujung daftar',
      })
    }

    // ── Cabang UBAH ──
    const { aksi: _aksi, ...patch } = parsed.data
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada perubahan yang dikirim' },
        { status: 400 }
      )
    }

    const row = await TeamContactService_update(id, patch, auth.uid)
    return NextResponse.json({ success: true, data: row })

  } catch (error) {
    console.error('[PATCH /api/superadmin/team-contacts/[id]]', error)
    const pesan  = error instanceof Error ? error.message : 'Server error'
    const status = error instanceof Error ? 400 : 500
    return NextResponse.json({ success: false, message: pesan }, { status })
  }
}

// ─── DELETE — hapus lunak ─────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID kontak wajib diisi' }, { status: 400 })
    }

    await TeamContactService_delete(id, auth.uid)
    return NextResponse.json({ success: true, message: 'Kontak berhasil dihapus' })

  } catch (error) {
    console.error('[DELETE /api/superadmin/team-contacts/[id]]', error)
    const pesan  = error instanceof Error ? error.message : 'Server error'
    const status = error instanceof Error ? 400 : 500
    return NextResponse.json({ success: false, message: pesan }, { status })
  }
}
