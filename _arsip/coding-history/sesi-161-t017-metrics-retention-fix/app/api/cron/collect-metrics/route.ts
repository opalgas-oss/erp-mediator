// app/api/cron/collect-metrics/route.ts
// POST — QStash webhook: trigger pengumpulan metrics L1 + L3
// Dipanggil oleh: QStash scheduler (bukan browser langsung)
// Verifikasi signature QStash wajib sebelum eksekusi apapun
// Dibuat: Sesi #153 — PL-S09 Step 3.5
//
// Catatan desain:
// - QSTASH_CURRENT_SIGNING_KEY tetap di .env (bootstrap level — CREDENTIAL_SYSTEM_SPEC BAB 2 Kategori 1)
//   karena verifikasi signature ini diperlukan SEBELUM kode lain bisa berjalan securely.
// - Header x-qstash-signature adalah HMAC-SHA256 dari body menggunakan signing key.
// - L1 (ping semua provider) dipanggil setiap 1 menit via QStash.
// - L3 (deep check) dipanggil setiap 15 menit — ditentukan dari query param ?layer=L3.

import { NextRequest, NextResponse } from 'next/server'
import { collectL1Metrics, collectL3Metrics } from '@/lib/services/metrics-collector.service'
import crypto from 'crypto'

// ─── verifyQStashSignature ────────────────────────────────────────────────────

async function verifyQStashSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  if (!signingKey) {
    console.error('[collect-metrics] QSTASH_CURRENT_SIGNING_KEY tidak ada di .env')
    return false
  }

  const signature = req.headers.get('upstash-signature') ?? req.headers.get('x-qstash-signature')
  if (!signature) return false

  try {
    // QStash signature format: "v1:HMAC-SHA256-base64"
    const [version, receivedHmac] = signature.split(':')
    if (version !== 'v1' || !receivedHmac) return false

    const expectedHmac = crypto
      .createHmac('sha256', signingKey)
      .update(rawBody)
      .digest('base64')

    // Constant-time comparison untuk mencegah timing attack
    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac),
      Buffer.from(expectedHmac)
    )
  } catch {
    return false
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Baca body sebagai string untuk verifikasi signature
  const rawBody = await req.text()

  // Verifikasi signature QStash — wajib sebelum eksekusi apapun
  const isValid = await verifyQStashSignature(req, rawBody)
  if (!isValid) {
    console.warn('[collect-metrics] Signature QStash tidak valid — request ditolak')
    return NextResponse.json(
      { success: false, message: 'Unauthorized — invalid QStash signature' },
      { status: 401 }
    )
  }

  // Tentukan layer dari query param (?layer=L1 atau ?layer=L3)
  // Default: L1 (ping health, setiap 1 menit)
  const layer = req.nextUrl.searchParams.get('layer') ?? 'L1'

  try {
    if (layer === 'L3') {
      // Deep check setiap 15 menit
      const result = await collectL3Metrics()
      return NextResponse.json({
        success:   true,
        layer:     'L3',
        processed: result.processed,
        errors:    result.errors,
      })
    } else {
      // Ping health setiap 1 menit (default)
      const result = await collectL1Metrics()
      return NextResponse.json({
        success:   true,
        layer:     'L1',
        processed: result.processed,
        errors:    result.errors,
      })
    }
  } catch (err) {
    console.error('[POST /api/cron/collect-metrics]', err)
    return NextResponse.json(
      { success: false, message: 'Gagal mengumpulkan metrics' },
      { status: 500 }
    )
  }
}
