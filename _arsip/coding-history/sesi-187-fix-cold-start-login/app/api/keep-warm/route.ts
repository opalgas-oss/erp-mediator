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
// FIX Sesi #085: tambah direct ping ke semua lambda kritis dalam login flow
//   Root cause: /api/auth/warmup hanya warm endpoint ringan — tidak menjamin
//   send-otp, verify-otp, check-session ter-warm jika Vercel split ke bundle berbeda.
//   Verifikasi: cold start login 11s + send-otp pending terukur saat test TC-E04.
//   Fix: explicit ping ke /login (warm server action bundle), /api/auth/send-otp,
//   /api/auth/verify-otp, /api/auth/check-session. Respon 401 (no auth) tetap
//   mengakibatkan lambda ter-warm — yang penting lambda ter-inisialisasi.
//
// Dilindungi CRON_SECRET via header Authorization: Bearer <secret>.

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Fan-out: ping semua lambda kritis secara parallel ─────────────────────
  // Strategi:
  //   - /login              → warm server action bundle (loginUnifiedAction)
  //   - /api/auth/warmup    → warm auth bundle (legacy, tetap dipertahankan)
  //   - /api/auth/send-otp  → direct warm — 401 OK, lambda tetap ter-inisialisasi
  //   - /api/auth/verify-otp → direct warm — 401 OK, lambda tetap ter-inisialisasi
  //   - /api/auth/check-session → direct warm — 401 OK, lambda tetap ter-inisialisasi
  //   - /dashboard/superadmin → warm SA RSC lambda
  //   - /dashboard/vendor     → warm Vendor RSC lambda
  // Semua best-effort — tidak blocking response keep-warm.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : null)

  if (baseUrl) {
    const targets = [
      // Login flow — server action + API lambdas
      `${baseUrl}/login`,
      `${baseUrl}/api/auth/warmup`,
      `${baseUrl}/api/auth/send-otp`,
      `${baseUrl}/api/auth/verify-otp`,
      `${baseUrl}/api/auth/check-session`,
      // Dashboard RSC lambdas
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
      warmed: [
        'login-page',
        'auth-bundle',
        'send-otp',
        'verify-otp',
        'check-session',
        'dashboard-sa',
        'dashboard-vendor',
      ],
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
