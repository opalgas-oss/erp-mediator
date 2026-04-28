import { NextResponse } from 'next/server'

/**
 * Endpoint keep-warm — mencegah cold start Vercel serverless functions.
 * Dipanggil oleh cron-job.org setiap 1 menit.
 * Tidak memerlukan autentikasi.
 *
 * Cara kerja:
 * Vercel membundle semua API routes ke dalam function yang sama.
 * Setiap kali endpoint ini dipanggil, seluruh bundle API (termasuk
 * login action, send-otp, verify-otp, dll.) tetap dalam kondisi warm.
 *
 * Dilindungi CRON_SECRET via header Authorization: Bearer <secret>
 * agar tidak bisa di-abuse pihak luar.
 *
 * URL yang di-ping oleh cron-job.org:
 *   1. https://<domain>/api/keep-warm  (endpoint ini — API bundle)
 *   2. https://<domain>/login          (page bundle — login + shared modules)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json(
    {
      status: 'warm',
      timestamp: new Date().toISOString(),
      service: 'ERP Mediator Hyperlocal',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
