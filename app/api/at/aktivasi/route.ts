// app/api/at/aktivasi/route.ts
// API Route — Update lifecycle_status AT menjadi 'active' setelah AT berhasil buat password.
//
// Dipanggil oleh: app/aktivasi/page.tsx (client-side, setelah supabase.auth.updateUser berhasil)
// Validasi:
//   - User harus authenticated (JWT valid dari cookie session)
//   - lifecycle_status harus 'in_registration' (tidak boleh re-activate yang sudah active)
//
// Dibuat: Sesi #252 — HUTANG-AKTIVASI-PAGE
// Referensi: PROMPT_SESI_252 LANGKAH 2, TDD_AT_AUTH_v1.md K-01 Gaya A

import { NextResponse }               from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(): Promise<NextResponse> {
  try {
    const db = createServerSupabaseClient()

    // Ambil user dari session (JWT sudah di-set oleh supabase.auth.updateUser di client)
    const { data: { user }, error: userError } = await db.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Sesi tidak valid. Silakan klik link aktivasi lagi.' },
        { status: 401 }
      )
    }

    // Cek lifecycle_status aktual
    const { data: profile, error: profileError } = await db
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

    // Validasi: hanya admin_tenant yang boleh akses route ini
    if (profile.role !== 'admin_tenant') {
      return NextResponse.json(
        { ok: false, error: 'Akses tidak diizinkan.' },
        { status: 403 }
      )
    }

    // Validasi: hanya yang masih in_registration yang perlu diaktivasi
    if (profile.lifecycle_status === 'active') {
      // Akun sudah aktif — tidak perlu update, kembalikan OK
      return NextResponse.json({ ok: true, alreadyActive: true })
    }

    if (profile.lifecycle_status !== 'in_registration') {
      return NextResponse.json(
        { ok: false, error: `Status akun '${profile.lifecycle_status}' tidak dapat diaktivasi.` },
        { status: 400 }
      )
    }

    // Update lifecycle_status = 'active'
    const { error: updateError } = await db
      .from('user_profiles')
      .update({
        lifecycle_status: 'active',
        updated_at:       new Date().toISOString(),
      })
      .eq('id', user.id)
      .eq('lifecycle_status', 'in_registration') // double-check race condition

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
