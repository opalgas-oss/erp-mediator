// app/api/at/aktivasi/route.ts
// API Route — Update lifecycle_status AT menjadi 'active' setelah AT berhasil buat password.
//
// Dipanggil oleh: app/aktivasi/page.tsx (client, setelah supabase.auth.updateUser berhasil)
//
// FIX T-4 S#252b (FATAL BUG):
//   Versi S#252 awal pakai createServerSupabaseClient (service_role + persistSession:false).
//   Client itu TIDAK punya cookie session user → db.auth.getUser() selalu null → route 401 →
//   lifecycle_status TIDAK PERNAH jadi 'active'. Bug yang sama dengan pola lama.
//   Fix: pakai createServerClient (@supabase/ssr) yang baca cookie session user untuk getUser(),
//   lalu service_role client terpisah untuk UPDATE (bypass RLS). Dua client, dua tujuan:
//     - userClient (anon + cookie)   → identitas user (getUser)
//     - adminClient (service_role)   → tulis lifecycle_status (bypass RLS)
//
// Validasi:
//   - User authenticated (cookie session valid)
//   - role = admin_tenant
//   - lifecycle_status = 'in_registration' (tidak re-activate yang sudah active)
//
// Dibuat: Sesi #252 — HUTANG-AKTIVASI-PAGE. Fix T-4: Sesi #252b.
// Referensi: PROMPT_SESI_252 LANGKAH 2, TDD_AT_AUTH_v1.md K-01 Gaya A, pola lib/auth-server.ts

import { NextResponse }               from 'next/server'
import { cookies }                    from 'next/headers'
import { createServerClient }         from '@supabase/ssr'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(): Promise<NextResponse> {
  try {
    // ── Client 1: baca identitas user dari cookie session (@supabase/ssr) ──────
    const cookieStore = await cookies()
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* Route ini tidak perlu set/refresh cookie */ },
        },
      }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Sesi tidak valid. Silakan klik link aktivasi lagi.' },
        { status: 401 }
      )
    }

    // ── Client 2: service_role untuk baca profil + UPDATE (bypass RLS) ─────────
    const adminDb = createServerSupabaseClient()

    const { data: profile, error: profileError } = await adminDb
      .from('user_profiles')
      .select('lifecycle_status, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, error: 'Profil pengguna tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Hanya admin_tenant yang boleh akses route ini
    if (profile.role !== 'admin_tenant') {
      return NextResponse.json(
        { ok: false, error: 'Akses tidak diizinkan.' },
        { status: 403 }
      )
    }

    // Sudah aktif → idempoten, kembalikan OK
    if (profile.lifecycle_status === 'active') {
      return NextResponse.json({ ok: true, alreadyActive: true })
    }

    // Hanya in_registration yang bisa diaktivasi
    if (profile.lifecycle_status !== 'in_registration') {
      return NextResponse.json(
        { ok: false, error: `Status akun '${profile.lifecycle_status}' tidak dapat diaktivasi.` },
        { status: 400 }
      )
    }

    // UPDATE lifecycle_status = 'active' (double-check race via .eq lifecycle lama)
    const { error: updateError } = await adminDb
      .from('user_profiles')
      .update({
        lifecycle_status: 'active',
        updated_at:       new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('lifecycle_status', 'in_registration')

    if (updateError) {
      console.error('[api/at/aktivasi] UPDATE lifecycle_status gagal:', updateError.message)
      return NextResponse.json(
        { ok: false, error: 'Gagal mengaktivasi akun. Silakan coba lagi.' },
        { status: 500 }
      )
    }

    console.log(`[api/at/aktivasi] AT ${user.id} berhasil diaktivasi`)
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[api/at/aktivasi] Unexpected error:', err)
    return NextResponse.json(
      { ok: false, error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
