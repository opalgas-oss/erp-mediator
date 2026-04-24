// app/api/auth/load-user-profile/route.ts
// POST — Muat profil user dari DB untuk login flow.
//
// Dipakai oleh SEMUA role saat login berhasil — satu fungsi bersama.
//   - tenant_id = null  → SUPERADMIN → query tabel `users`
//   - tenant_id = UUID  → role lain  → query tabel `user_profiles`
//
// Menggantikan query Supabase langsung dari browser (lambat + melanggar arsitektur).
// Server-side query jauh lebih cepat: Vercel dan Supabase berada di region yang sama.
//
// Dibuat Sesi #056 — fix TC-D03 (Vendor lambat)
// Update Sesi #056 — tambah support SuperAdmin (tenant_id null)
// Update Sesi #057 — relax Zod UUID validation ke regex format

import { NextRequest, NextResponse }  from 'next/server'
import { z }                          from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────
// Regex UUID-format: terima 8-4-4-4-12 hex tanpa cek version/variant bit
// Alasan: tenant_id project ini pakai format UUID custom (aaaaaaaa-0000-...)
// yang valid di PostgreSQL tapi ditolak Zod strict .uuid()
const UUID_FORMAT = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i

const RequestSchema = z.object({
  uid:       z.string().regex(UUID_FORMAT, 'UID tidak valid'),
  tenant_id: z.string().regex(UUID_FORMAT, 'Tenant ID tidak valid').nullable().optional(),
})

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Validasi input ────────────────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { uid, tenant_id } = parsed.data
    const db = createServerSupabaseClient()

    // ── SUPERADMIN: tenant_id null → query tabel users ────────────────────────
    // SUPERADMIN tidak punya tenant_id dan datanya di tabel users, bukan user_profiles
    if (!tenant_id) {
      const { data: userRow, error } = await db
        .from('users')
        .select('nama')
        .eq('id', uid)
        .single()

      if (error || !userRow) {
        // SUPERADMIN tetap bisa login meski nama tidak ditemukan — non-critical
        return NextResponse.json({ success: true, nama: '', nomor_wa: '', role: 'SUPERADMIN', status: '' })
      }

      return NextResponse.json({
        success:  true,
        nama:     userRow.nama || '',
        nomor_wa: '',
        role:     'SUPERADMIN',
        status:   '',
      })
    }

    // ── Role lain: tenant_id ada → query tabel user_profiles ─────────────────
    const { data: profile, error } = await db
      .from('user_profiles')
      .select('nama, role, nomor_wa, status')
      .eq('id', uid)
      .eq('tenant_id', tenant_id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profil user tidak ditemukan' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success:  true,
      nama:     profile.nama     || '',
      nomor_wa: profile.nomor_wa || '',
      role:     profile.role     || '',
      status:   profile.status   || '',
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
