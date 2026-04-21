// app/api/auth/logout/route.ts
// POST — Tandai semua sesi aktif user sebagai logout di tabel session_logs
//
// Dipanggil SEBELUM supabase.auth.signOut() di sisi client.
// Urutan wajib: call API ini → signOut → clear cookies → navigate ke /login
//
// Menggunakan service_role client agar bisa update session_logs
// tanpa tergantung RLS policy di tabel tersebut.

import { NextResponse }               from 'next/server'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    // Verifikasi JWT — harus valid (dipanggil sebelum signOut)
    const payload = await verifyJWT()
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const db = createServerSupabaseClient()

    // Tandai semua sesi aktif user ini sebagai logout
    // logout_at IS NULL = sesi yang belum pernah logout
    const { error } = await db
      .from('session_logs')
      .update({ logout_at: new Date().toISOString() })
      .eq('uid', payload.uid)
      .is('logout_at', null)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[POST /api/auth/logout] Error:', error)
    // Tetap return success agar flow logout di client tidak terhenti
    // Session log mungkin tidak terupdate tapi user tetap bisa logout
    return NextResponse.json({ success: true })
  }
}
