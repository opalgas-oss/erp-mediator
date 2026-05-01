// app/api/keep-warm/route.ts
// Endpoint keep-warm — mencegah cold start Vercel serverless functions.
// Dipanggil oleh cron-job.org setiap 1 menit dan GitHub Actions setiap 3 menit.
//
// OPTIMASI Sesi #075: tambah fan-out ping ke /api/auth/warmup
//   Tujuan: memastikan auth bundle (send-otp, verify-otp, check-session) ikut warm.
//   Latar belakang: send-otp cold start 3.92s terukur di Sesi #074 pada Preview URL.
//   Root cause: Vercel bisa split route handlers ke bundle berbeda jika bundle besar.
//   Fix: ping /api/auth/warmup secara parallel saat keep-warm dipanggil.
//
// OPTIMASI Sesi #080: tambah fan-out ping ke /dashboard/superadmin dan /dashboard/vendor
//   Tujuan: memastikan dashboard RSC lambda ikut warm — bukan hanya API bundle.
//   Latar belakang: SA RSC cold 710ms terukur di Sesi #080 karena dashboard lambda
//   tidak pernah ter-warm oleh cron (hanya API routes yang dipanggil).
//   Fix: ping dashboard routes secara parallel. Middleware akan redirect (302) karena
//   tidak ada auth, tapi Edge function + routing infrastructure tetap ter-warm.
//   Pakai redirect: 'manual' agar fetch tidak follow redirect ke /login.
//
// Dilindungi CRON_SECRET via header Authorization: Bearer <secret>.

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Fan-out: ping auth bundle secara parallel ─────────────────────────────
  // /api/auth/warmup adalah endpoint ringan tanpa auth di bundle yang sama dengan
  // send-otp, verify-otp, check-session — memastikan bundle tersebut ikut warm.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : null)

  if (baseUrl) {
    // Fan-out semua target secara PARALLEL — best-effort, tidak blocking response
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
