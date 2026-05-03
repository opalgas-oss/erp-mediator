// ARSIP — app/api/keep-warm/route.ts
// Snapshot SEBELUM fix cold start login flow — Sesi #085
// Bug: keep-warm hanya ping /api/auth/warmup (endpoint ringan, tidak menjamin
//      send-otp dan verify-otp ter-warm jika Vercel split ke bundle berbeda).
// Fix: tambah direct ping ke semua lambda kritis: /login, send-otp, verify-otp,
//      check-session, session-log, user-presence.

// app/api/keep-warm/route.ts
// Endpoint keep-warm — mencegah cold start Vercel serverless functions.
// Dipanggil oleh cron-job.org setiap 1 menit dan GitHub Actions setiap 3 menit.
//
// OPTIMASI Sesi #075: tambah fan-out ping ke /api/auth/warmup
// OPTIMASI Sesi #080: tambah fan-out ping ke /dashboard/superadmin dan /dashboard/vendor

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : null)

  if (baseUrl) {
    const targets = [
      `${baseUrl}/api/auth/warmup`,
      `${baseUrl}/dashboard/superadmin`,
      `${baseUrl}/dashboard/vendor`,
    ]

    await Promise.allSettled(
      targets.map(url =>
        fetch(url, { method: 'GET', redirect: 'manual' })
          .catch(() => { /* abaikan — fan-out bersifat best-effort */ })
      )
    )
  }

  return NextResponse.json(
    {
      status:    'warm',
      timestamp: new Date().toISOString(),
      service:   'ERP Mediator Hyperlocal',
      warmed:    ['api-bundle', 'auth-bundle', 'dashboard-sa', 'dashboard-vendor'],
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
