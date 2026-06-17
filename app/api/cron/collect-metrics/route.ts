// app/api/cron/collect-metrics/route.ts
// POST — Cron webhook: trigger pengumpulan metrics L1 + L3
// Dipanggil oleh: QStash scheduler (sekarang) atau Vercel Cron (jika upgrade Pro)
// Dibuat: Sesi #153 — PL-S09 Step 3.5
// PERUBAHAN Sesi #161 — T-017: tambah baca data_retention_days dari config_registry
// PERUBAHAN Sesi #171 — T-055: refactor ke getConfigValues (1 round-trip)
// PERUBAHAN Sesi #292 — dual-mode verification: CRON_MODE=qstash|vercel
//   Ganti cron provider cukup ubah env var CRON_MODE — tanpa coding ulang.
//
// Catatan desain:
// - CRON_MODE=qstash  → verifikasi via QSTASH_CURRENT_SIGNING_KEY (HMAC-SHA256)
// - CRON_MODE=vercel  → verifikasi via CRON_SECRET header (Vercel Pro native cron)
// - Kedua key tetap di .env (bootstrap level — CREDENTIAL_SYSTEM_SPEC BAB 2 Kategori 1)
//   karena verifikasi diperlukan SEBELUM kode lain bisa berjalan securely.
// - L1 (ping semua provider) dipanggil setiap 1 menit.
// - L3 (deep check) dipanggil setiap 15 menit — dari query param ?layer=L3.

import { NextRequest, NextResponse } from 'next/server'
import { collectL1Metrics, collectL3Metrics } from '@/lib/services/metrics-collector.service'
import { getConfigValues, parseConfigNumber }   from '@/lib/config-registry'
import crypto from 'crypto'

// ─── verifyQStashSignature ────────────────────────────────────────────────────

async function verifyQStashSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  if (!signingKey) {
    console.error('[collect-metrics] QSTASH_CURRENT_SIGNING_KEY tidak ada di env')
    return false
  }

  const signature = req.headers.get('upstash-signature') ?? req.headers.get('x-qstash-signature')
  if (!signature) return false

  try {
    const [version, receivedHmac] = signature.split(':')
    if (version !== 'v1' || !receivedHmac) return false

    const expectedHmac = crypto
      .createHmac('sha256', signingKey)
      .update(rawBody)
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(receivedHmac),
      Buffer.from(expectedHmac)
    )
  } catch {
    return false
  }
}

// ─── verifyVercelCronSecret ───────────────────────────────────────────────────

function verifyVercelCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[collect-metrics] CRON_SECRET tidak ada di env')
    return false
  }
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

// ─── verifyRequest ────────────────────────────────────────────────────────────

async function verifyRequest(req: NextRequest, rawBody: string): Promise<boolean> {
  const mode = process.env.CRON_MODE ?? 'qstash'

  if (mode === 'vercel') {
    return verifyVercelCronSecret(req)
  }

  // Default: qstash
  return verifyQStashSignature(req, rawBody)
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const isValid = await verifyRequest(req, rawBody)
  if (!isValid) {
    const mode = process.env.CRON_MODE ?? 'qstash'
    console.warn(`[collect-metrics] Verifikasi gagal (mode: ${mode}) — request ditolak`)
    return NextResponse.json(
      { success: false, message: 'Unauthorized — invalid cron credentials' },
      { status: 401 }
    )
  }

  const layer = req.nextUrl.searchParams.get('layer') ?? 'L1'

  try {
    if (layer === 'L3') {
      const result = await collectL3Metrics()
      return NextResponse.json({
        success:   true,
        layer:     'L3',
        processed: result.processed,
        errors:    result.errors,
      })
    } else {
      const cfg           = await getConfigValues('monitoring')
      const retentionDays = parseConfigNumber(cfg['data_retention_days']         ?? '30',   30)
      const thresholdMs   = parseConfigNumber(cfg['alert_threshold_response_ms'] ?? '3000', 3000)
      const cooldown      = parseConfigNumber(cfg['alert_cooldown_minutes']       ?? '30',   30)
      const consecutive   = parseConfigNumber(cfg['alert_consecutive_failures']   ?? '3',    3)
      const result        = await collectL1Metrics(retentionDays, thresholdMs, cooldown, consecutive)
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
