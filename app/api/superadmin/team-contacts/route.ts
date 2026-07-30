// app/api/superadmin/team-contacts/route.ts
// GET    — Daftar kontak tim SA (siap-render, prioritas ordinal 1·2·3)
// POST   — Tambah satu kontak tim SA
// Hanya SuperAdmin. Route di bawah /api/superadmin/* → middleware Guard 6 inject header auth.
//
// Dibuat: Sesi #423 — Direktori Kontak Tim Tahap A, FASE 3.5
//
// Layer Route (3-layer: Route → Service → Repository). Tugas berkas ini HANYA:
//   1. autentikasi (requireSuperAdmin — aset yang sudah ada, jangan tulis ulang)
//   2. VALIDASI BENTUK MASUKAN dengan DTO Zod  ← pattern WAJIB cr_patterns.is_mandatory
//   3. memanggil service + membentuk respons
// NOL logika bisnis dan NOL query DB di sini.
//
// Catatan pattern (S#423): ini tempat PERTAMA pattern "DTO Zod di Route Handler" benar-benar
// ditegakkan di repo — pencarian S#423 menemukan NOL berkas DTO/schema di `lib/`, dan
// `/api/config/bulk` menerima nilai apa pun tanpa validasi. Skema di bawah sengaja ditulis
// inline di route (bukan di lib/) supaya sesuai bunyi pattern-nya: validasi DI Route Handler.

import { NextRequest, NextResponse } from 'next/server'
import { z }                        from 'zod'
import { requireSuperAdmin }        from '@/lib/auth-server'
import {
  TeamContactService_list,
  TeamContactService_create,
} from '@/lib/services/team-contact.service'
import type { BuatKontakTimPayload } from '@/lib/types/team-contact.types'

// ─── DTO Zod ──────────────────────────────────────────────────────────────────
// 6 jabatan = GLOSSARY BAB 7, sama persis dengan CHECK constraint chk_team_contacts_jabatan.
// Istilah "PIC" DILARANG sebagai nilai maupun nama kolom (ditegaskan Philips S#413).

const JabatanEnum = z.enum([
  'penanggung_jawab',
  'operator',
  'finance',
  'warehouse',
  'sales',
  'lainnya',
])

const ScopeEnum = z.enum(['super_admin', 'admin_tenant', 'vendor'])

const BuatKontakSchema = z.object({
  nama:                  z.string().trim().min(1, 'Nama wajib diisi').max(150, 'Nama maksimal 150 karakter'),
  // Alamat email adalah TUJUAN NYATA tautan "hubungi tim kami" — salah ketik di sini
  // berarti laporan bug terkirim ke alamat yang tidak ada dan tidak ada yang tahu.
  email:                 z.string().trim().email('Format email tidak valid').max(255),
  telepon:               z.string().trim().max(30).nullable().optional().default(null),
  jabatan:               JabatanEnum,
  publish_bug_dashboard: z.boolean().optional().default(false),
  publish_public_page:   z.boolean().optional().default(false),
  // Tahap A hanya mengisi scope SA; ketiga nilai tetap diterima karena skema tabelnya
  // memang didesain sekali untuk SA + AT + Vendor (KONSEP_BISNIS Keputusan 2).
  scope:                 ScopeEnum.optional().default('super_admin'),
  tenant_id:             z.string().uuid().nullable().optional().default(null),
  vendor_id:             z.string().uuid().nullable().optional().default(null),
  user_id:               z.string().uuid().nullable().optional().default(null),
})

// sort_order SENGAJA tidak ada di skema — nilainya dihitung service (max+10, K-420-5).
// SA menggeser lewat tombol panah, tidak pernah mengetik angka.

// ─── GET — daftar kontak ──────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const data = await TeamContactService_list('super_admin', null)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    // WAJIB console.error — `catch {}` kosong di jalur fitur anti-bug-senyap justru
    // menjadikannya bug senyap (BUG-034 · BUG-038).
    console.error('[GET /api/superadmin/team-contacts]', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── POST — tambah kontak ─────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    let raw: unknown
    try {
      raw = await request.json()
    } catch (errParse) {
      console.warn('[POST /api/superadmin/team-contacts] body bukan JSON valid:', errParse)
      return NextResponse.json(
        { success: false, message: 'Body permintaan bukan JSON yang valid' },
        { status: 400 }
      )
    }

    const parsed = BuatKontakSchema.safeParse(raw)
    if (!parsed.success) {
      const pesan = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`)
        .join(' · ')
      return NextResponse.json({ success: false, message: pesan }, { status: 400 })
    }

    const payload: BuatKontakTimPayload = parsed.data
    const row = await TeamContactService_create(payload, auth.uid)

    return NextResponse.json({ success: true, data: row }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/superadmin/team-contacts]', error)
    const pesan = error instanceof Error ? error.message : 'Server error'
    // Galat aturan bisnis dari service (jabatan/scope/nama) = salah masukan → 400.
    // Selain itu 500. Membedakannya penting supaya SA tahu mana yang bisa dia perbaiki sendiri.
    const status = error instanceof Error ? 400 : 500
    return NextResponse.json({ success: false, message: pesan }, { status })
  }
}
