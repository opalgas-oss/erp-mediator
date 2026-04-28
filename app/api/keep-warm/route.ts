import { NextResponse } from 'next/server'

/**
 * Endpoint keep-warm — mencegah cold start Vercel serverless functions.
 * Dipanggil oleh cron-job.org setiap 5 menit.
 * Tidak memerlukan autentikasi.
 *
 * Cara kerja:
 * Vercel membundle semua API routes ke dalam function yang sama.
 * Setiap kali endpoint ini dipanggil, seluruh bundle API (termasuk
 * login action, send-otp, verify-otp, dll.) tetap dalam kondisi warm.
 *
 * Target: cron-job.org ping endpoint ini setiap 5 menit.
 * URL yang di-ping:
 *   1. https://<domain>/api/keep-warm  ← endpoint ini (API bundle)
 *   2. https://<domain>/login          ← page bundle (login + dashboard RSC)
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'warm',
      timestamp: new Date().toISOString(),
      service: 'ERP Mediator Hyperlocal',
    },
    {
      status: 200,
      headers: {
        // Jangan cache response ini — setiap ping harus hit server aktual
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
