// app/api/cron/send-digest/route.ts
// POST — Cron webhook: kirim digest harian WA + Email (A5 Fase 2)
// Dipanggil oleh: QStash scheduler 1x/hari jam digest_send_hour:digest_send_minute WIB
// Dibuat: Sesi #351 — A5 Daily Digest WA/Email
//
// Catatan desain:
// - CRON_MODE=qstash  → verifikasi via @upstash/qstash Receiver (JWT)
// - CRON_MODE=vercel  → verifikasi via CRON_SECRET header (untuk test lokal/staging)
// - Pola dual-mode sama persis dengan collect-metrics/route.ts (tidak duplikasi — beda endpoint)

import { NextRequest, NextResponse } from 'next/server'
import { Receiver }                  from '@upstash/qstash'
import { sendDailyDigest }           from '@/lib/services/alert-digest.service'

// ─── verifyQStashSignature ────────────────────────────────────────────────────

async function verifyQStashSignature(req: NextRequest, rawBody: string): Promise<boolean> {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY
  const nextKey    = process.env.QSTASH_NEXT_SIGNING_KEY
  if (!currentKey || !nextKey) {
    console.error('[send-digest] QSTASH signing keys tidak ada di env')
    return false
  }

  const signature = req.headers.get('upstash-signature')
  if (!signature) {
    console.error('[send-digest] Header upstash-signature tidak ada')
    return false
  }

  try {
    const receiver = new Receiver({
      currentSigningKey: currentKey,
      nextSigningKey:    nextKey,
    })
    await receiver.verify({ signature, body: rawBody, url: req.url })
    return true
  } catch (err) {
    console.error('[send-digest] QStash signature invalid:', err)
    return false
  }
}

// ─── verifyVercelCronSecret ───────────────────────────────────────────────────

function verifyVercelCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[send-digest] CRON_SECRET tidak ada di env')
    return false
  }
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

// ─── verifyRequest ────────────────────────────────────────────────────────────

async function verifyRequest(req: NextRequest, rawBody: string): Promise<boolean> {
  const mode = process.env.CRON_MODE ?? 'qstash'
  if (mode === 'vercel') return verifyVercelCronSecret(req)
  return verifyQStashSignature(req, rawBody)
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const isValid = await verifyRequest(req, rawBody)
  if (!isValid) {
    const mode = process.env.CRON_MODE ?? 'qstash'
    console.warn(`[send-digest] Verifikasi gagal (mode: ${mode}) — request ditolak`)
    return NextResponse.json(
      { success: false, message: 'Unauthorized — invalid cron credentials' },
      { status: 401 }
    )
  }

  try {
    const result = await sendDailyDigest()

    console.log(
      `[send-digest] selesai — insiden: ${result.insiden_count}, ` +
      `wa: ${result.sent_wa}, email: ${result.sent_email}` +
      (result.error ? `, error: ${result.error}` : '')
    )

    return NextResponse.json({
      success:       result.success,
      sent_wa:       result.sent_wa,
      sent_email:    result.sent_email,
      insiden_count: result.insiden_count,
      ...(result.error ? { error: result.error } : {}),
    })
  } catch (err) {
    console.error('[POST /api/cron/send-digest]', err)
    return NextResponse.json(
      { success: false, message: 'Gagal mengirim digest harian' },
      { status: 500 }
    )
  }
}
