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
// FIX Sesi #188: warm POST Server Action bundle loginUnifiedAction via endpoint warmup-login-action.
//   Root cause BUG-021: keep-warm fan-out GET-only tidak menjangkau POST Server Action lambda
//   loginUnifiedAction. Vercel memisah Page Render bundle (GET /login) dari Server Action
//   bundle (POST /login → loginUnifiedAction). GET /login tidak warm POST bundle.
//   Fix: tambah endpoint GET /api/auth/warmup-login-action yang import semua modul
//   loginUnifiedAction, ping dari fan-out ini, Server Action bundle ter-warm via GET.
//
// Dilindungi CRON_SECRET via header Authorization: Bearer <secret>.
//
// 🔴 FIX Sesi #456 (R3 · A3) — ENDPOINT INI DULU BERBOHONG. Sekarang melapor apa adanya.
//   Yang salah sebelumnya: `warmed:[...]` adalah ARRAY LITERAL STATIS berisi 8 nama, dicetak
//   sama persis pada SETIAP panggilan — termasuk saat seluruh fan-out gagal, dan termasuk saat
//   `baseUrl` tidak ketemu sehingga fan-out TIDAK PERNAH DIJALANKAN SAMA SEKALI. Hasil
//   `Promise.allSettled` dibuang, dan `.catch(() => {})` menelan tiap kegagalan tanpa jejak.
//   Akibatnya jawaban `{"status":"warm","warmed":[8 target]}` tidak membuktikan apa pun.
//   Sekarang: `warmed` DIUKUR dari hasil tiap fetch (terjangkau / http / error), ada `ringkasan`,
//   ada `base_url`, dan `status` bisa berbunyi `warm` · `partial` · `skipped`.
//
//   ⚠️ YANG SENGAJA TIDAK DIUBAH: kode HTTP tetap **200** walau ada target gagal. Menaikkannya
//   jadi non-200 akan membuat langkah "Ping Preview URL" di keep-warm.yml gagal (exit 1) dan
//   mengubah perilaku alarm — itu keputusan tersendiri, di luar scope R3, dan BELUM diusulkan.

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
  //   - /api/auth/warmup-login-action → warm POST Server Action bundle loginUnifiedAction (S#188 fix BUG-021)
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

  const TARGETS: ReadonlyArray<{ nama: string; path: string }> = [
    // Login flow — server action + API lambdas
    { nama: 'login-page',           path: '/login' },
    { nama: 'warmup-login-action',  path: '/api/auth/warmup-login-action' }, // S#188 fix BUG-021
    { nama: 'auth-bundle',          path: '/api/auth/warmup' },
    { nama: 'send-otp',             path: '/api/auth/send-otp' },
    { nama: 'verify-otp',           path: '/api/auth/verify-otp' },
    { nama: 'check-session',        path: '/api/auth/check-session' },
    // Dashboard RSC lambdas
    { nama: 'dashboard-sa',         path: '/dashboard/superadmin' },
    { nama: 'dashboard-vendor',     path: '/dashboard/vendor' },
  ]

  type HasilWarm = {
    target:     string
    terjangkau: boolean
    http:       number | null
    error:      string | null
  }

  let hasil: HasilWarm[] = []

  if (baseUrl) {
    const settled = await Promise.allSettled(
      TARGETS.map(t => fetch(`${baseUrl}${t.path}`, { method: 'GET', redirect: 'manual' }))
    )

    hasil = settled.map((s, i): HasilWarm => {
      const nama = TARGETS[i].nama
      // Status HTTP apa pun (200 / 302 / 401) berarti lambda-nya TER-INISIALISASI = tujuan warm
      // tercapai. Yang menandakan GAGAL hanyalah fetch yang menolak (DNS/TLS/timeout/jaringan).
      return s.status === 'fulfilled'
        ? { target: nama, terjangkau: true,  http: s.value.status, error: null }
        : { target: nama, terjangkau: false, http: null,
            error: s.reason instanceof Error ? s.reason.message : String(s.reason) }
    })
  }

  const gagal  = hasil.filter(h => !h.terjangkau).length
  const status = !baseUrl ? 'skipped' : gagal === 0 ? 'warm' : 'partial'

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      service:   'ERP Mediator Hyperlocal',
      base_url:  baseUrl ?? null,
      ringkasan: {
        total:      hasil.length,
        terjangkau: hasil.length - gagal,
        gagal,
      },
      // DIUKUR dari hasil fetch — bukan daftar literal (R3, S#456).
      warmed: hasil,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    }
  )
}
