// app/api/auth/logout/route.ts
// POST — Tandai semua sesi aktif user sebagai logout di tabel session_logs
//
// Dipanggil SEBELUM supabase.auth.signOut() di sisi client.
// Urutan wajib: call API ini → signOut → clear cookies → navigate ke /login
//
// Menggunakan service_role client agar bisa update session_logs
// tanpa tergantung RLS policy di tabel tersebut.

// REFACTOR Sesi #052 — BLOK E-05: Pakai SessionService.markLogout

import { NextResponse }  from 'next/server'
import { verifyJWT }     from '@/lib/auth-server'
import { markLogout }    from '@/lib/services/session.service'

export async function POST() {
  try {
    const payload = await verifyJWT()
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Delegasi ke SessionService
    await markLogout(payload.uid)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[POST /api/auth/logout] Error:', error)
    // Tetap return success agar flow logout di client tidak terhenti
    return NextResponse.json({ success: true })
  }
}
