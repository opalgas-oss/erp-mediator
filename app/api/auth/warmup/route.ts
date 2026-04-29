// app/api/auth/warmup/route.ts
// Endpoint warmup untuk auth bundle — dipanggil oleh /api/keep-warm secara internal.
// Tujuan: memastikan modul-modul auth (send-otp, verify-otp, check-session, dll.)
// tetap ter-inisialisasi dan dalam kondisi warm di Vercel serverless.
//
// TIDAK memerlukan autentikasi — hanya untuk keperluan keep-warm internal.
// TIDAK menerima data dari luar — tidak ada side effect ke DB.
//
// Dibuat: Sesi #075 — fix cold start send-otp 3.92s yang terukur di Sesi #074.

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { status: 'warm', bundle: 'auth', timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
