// app/api/auth/load-user-profile/route.ts
// POST — Muat profil user dari user_profiles untuk login flow.
//
// Dipakai oleh SEMUA role non-SUPERADMIN saat login berhasil.
// Menggantikan query Supabase langsung dari browser (melanggar arsitektur).
//
// Arsitektur: Browser → API route (server-side) → user_profiles
// Jauh lebih cepat dari browser → Supabase langsung karena:
//   - Vercel dan Supabase berada di region yang sama (sin1)
//   - Tidak ada cold start karena reuse connection
//   - Tidak bergantung RLS browser client
//
// Fix Sesi #056 — TC-D03: muatDataUser() pakai API ini, bukan browser query.

import { NextRequest, NextResponse }  from 'next/server'
import { z }                          from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:       z.string().uuid('UID tidak valid'),
  tenant_id: z.string().uuid('Tenant ID tidak valid'),
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

    // ── Query user_profiles via service role (server-side, tanpa RLS) ─────────
    // Pakai service role agar tidak bergantung pada session cookie browser.
    // Data yang dikembalikan: nama, nomor_wa, role, status saja — tidak lebih.
    const db = createServerSupabaseClient()
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
