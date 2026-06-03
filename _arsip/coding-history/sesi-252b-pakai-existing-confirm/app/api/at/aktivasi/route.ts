// ARSIP PRE-EDIT S#252b — app/api/at/aktivasi/route.ts (versi S#252 awal, SALAH)
// Bug T-4: pakai createServerSupabaseClient (service_role, persistSession:false) →
// db.auth.getUser() selalu null → route 401 → lifecycle_status tak pernah update.
// Diganti S#252b ke createServerClient (@supabase/ssr, baca cookie session user).

import { NextResponse }               from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(): Promise<NextResponse> {
  try {
    const db = createServerSupabaseClient()

    const { data: { user }, error: userError } = await db.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Sesi tidak valid. Silakan klik link aktivasi lagi.' },
        { status: 401 }
      )
    }

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

    if (profile.role !== 'admin_tenant') {
      return NextResponse.json(
        { ok: false, error: 'Akses tidak diizinkan.' },
        { status: 403 }
      )
    }

    if (profile.lifecycle_status === 'active') {
      return NextResponse.json({ ok: true, alreadyActive: true })
    }

    if (profile.lifecycle_status !== 'in_registration') {
      return NextResponse.json(
        { ok: false, error: `Status akun '${profile.lifecycle_status}' tidak dapat diaktivasi.` },
        { status: 400 }
      )
    }

    const { error: updateError } = await db
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
