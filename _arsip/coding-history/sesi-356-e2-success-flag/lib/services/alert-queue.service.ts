// lib/services/alert-queue.service.ts
// Service: Queue notifikasi alert via Upstash Redis (M6)
// Dibuat: Sesi #334 — FASE 2 M6 Alert Monitoring
//
// DESAIN:
//   Dua queue terpisah menggunakan Redis LIST (RPUSH enqueue, LPOP drain):
//     alert:queue:wa    → item notifikasi WA (Fonnte)
//     alert:queue:email → item notifikasi Email (Resend)
//
//   Alasan queue terpisah:
//     - Rate limit WA dan Email berbeda (Fonnte vs Resend)
//     - Retry logic dan error handling berbeda per channel
//     - Dead Letter: error ditulis ke alert_log.error_wa / alert_log.error_email (kolom sudah ada)
//
//   Worker pattern: inline di cron collectL1Metrics (drain setiap run).
//   Vercel Hobby compatible — tidak butuh worker process terpisah.
//
//   Config keys (dari config_registry, feature_key='alert'):
//     alert.resend_rate_per_second   = 2
//     alert.resend_backoff_initial_ms= 1000
//     alert.resend_backoff_max_ms    = 30000
//     alert.resend_max_retries       = 3
//     alert.fonnte_delay_seconds     = 2
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'
import { getRedisClient }      from '@/lib/redis'
import { getConfigValues }     from '@/lib/config-registry'
import { getCredential }       from '@/lib/services/credential.service'
import { sendFonnteWA }        from '@/lib/utils/fonnte.server'
import { sendResendEmailPlain } from '@/lib/utils/resend.server'
import { updateAlertLogNotifResult } from '@/lib/repositories/alert-log.repository'

// ─── Redis key constants ──────────────────────────────────────────────────────

const QUEUE_KEY_WA    = 'alert:queue:wa'
const QUEUE_KEY_EMAIL = 'alert:queue:email'

// ─── Tipe item queue ─────────────────────────────────────────────────────────

export interface AlertQueueItemWA {
  alertLogId:   string
  targetNumber: string
  message:      string
  /** Delay pengiriman ke Fonnte dalam detik (supplement — limit burst sisi Fonnte) */
  delaySeconds: number
}

export interface AlertQueueItemEmail {
  alertLogId:   string
  targetEmail:  string
  subject:      string
  message:      string
}

// ─── enqueueWA ───────────────────────────────────────────────────────────────

/**
 * Tambah item notifikasi WA ke queue Redis.
 * Dipanggil dari alert.service.ts (evaluateRule) sebagai ganti sendWAAlert langsung.
 *
 * @returns true jika berhasil enqueue, false jika Redis tidak tersedia (graceful degrade)
 */
export async function enqueueWA(item: AlertQueueItemWA): Promise<boolean> {
  const redis = await getRedisClient()
  if (!redis) {
    console.warn('[alert-queue] Redis tidak tersedia — WA tidak di-enqueue:', item.alertLogId)
    return false
  }
  await redis.rpush(QUEUE_KEY_WA, item)
  return true
}

// ─── enqueueEmail ────────────────────────────────────────────────────────────

/**
 * Tambah item notifikasi Email ke queue Redis.
 * Dipanggil dari alert.service.ts (evaluateRule) sebagai ganti sendEmailAlert langsung.
 *
 * @returns true jika berhasil enqueue, false jika Redis tidak tersedia (graceful degrade)
 */
export async function enqueueEmail(item: AlertQueueItemEmail): Promise<boolean> {
  const redis = await getRedisClient()
  if (!redis) {
    console.warn('[alert-queue] Redis tidak tersedia — Email tidak di-enqueue:', item.alertLogId)
    return false
  }
  await redis.rpush(QUEUE_KEY_EMAIL, item)
  return true
}

// ─── drainQueues ─────────────────────────────────────────────────────────────

/**
 * Drain kedua queue (WA + Email) — dipanggil di akhir collectL1Metrics setiap cron run.
 * Proses semua item yang ada, respek rate limit per channel.
 * Error per item → catat ke alert_log (DLQ), tidak hentikan drain keseluruhan.
 */
export async function drainQueues(): Promise<void> {
  await Promise.allSettled([
    drainWAQueue(),
    drainEmailQueue(),
  ])
}

// ─── drainWAQueue (internal) ─────────────────────────────────────────────────

async function drainWAQueue(): Promise<void> {
  const redis = await getRedisClient()
  if (!redis) return

  const cfg    = await getConfigValues('alert')
  const delay  = parseInt(cfg['fonnte_delay_seconds'] ?? '2', 10) * 1000
  const token  = await getCredential('fonnte', 'api_token')

  if (!token) {
    console.error('[alert-queue:wa] Token Fonnte tidak ada — drain dibatalkan')
    return
  }

  // LPOP satu per satu — proses sampai queue kosong.
  // @upstash/redis auto-deserialize: lpop kembalikan object, jangan JSON.parse lagi.
  let item: AlertQueueItemWA | null
  while ((item = await redis.lpop<AlertQueueItemWA>(QUEUE_KEY_WA)) !== null) {
    if (!item?.targetNumber || !item?.message) {
      console.error('[alert-queue:wa] Item tidak valid (field kurang):', item)
      continue
    }

    try {
      const result = await sendFonnteWA(item.targetNumber, item.message, token)
      if (!result.success) {
        await recordWAError(item.alertLogId, `Fonnte error: ${result.reason ?? 'Unknown'}`)
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      await recordWAError(item.alertLogId, reason)
    }

    // Delay antar item — sesuai config (supplement burst limit Fonnte)
    if (delay > 0) await sleep(delay)
  }
}

// ─── drainEmailQueue (internal) ──────────────────────────────────────────────

async function drainEmailQueue(): Promise<void> {
  const redis = await getRedisClient()
  if (!redis) return

  const cfg             = await getConfigValues('alert')
  const ratePerSec      = parseInt(cfg['resend_rate_per_second']    ?? '2', 10)
  const maxRetries      = parseInt(cfg['resend_max_retries']        ?? '3', 10)
  const backoffInitial  = parseInt(cfg['resend_backoff_initial_ms'] ?? '1000', 10)
  const backoffMax      = parseInt(cfg['resend_backoff_max_ms']     ?? '30000', 10)
  const delayBetween    = Math.ceil(1000 / ratePerSec) // ms antar item (rate limit)

  let item: AlertQueueItemEmail | null
  while ((item = await redis.lpop<AlertQueueItemEmail>(QUEUE_KEY_EMAIL)) !== null) {
    if (!item?.targetEmail || !item?.subject) {
      console.error('[alert-queue:email] Item tidak valid (field kurang):', item)
      continue
    }

    // Retry dengan exponential backoff
    let attempt = 0
    let success = false
    let lastError = ''

    while (attempt < maxRetries && !success) {
      try {
        const result = await sendResendEmailPlain(item.targetEmail, item.subject, item.message)
        if (result.success) {
          success = true
        } else {
          lastError = result.reason ?? 'Unknown error'
          attempt++
          if (attempt < maxRetries) {
            const backoff = Math.min(backoffInitial * Math.pow(2, attempt - 1), backoffMax)
            await sleep(backoff)
          }
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
        attempt++
        if (attempt < maxRetries) {
          const backoff = Math.min(backoffInitial * Math.pow(2, attempt - 1), backoffMax)
          await sleep(backoff)
        }
      }
    }

    if (!success) {
      await recordEmailError(item.alertLogId, `Gagal setelah ${maxRetries}x retry: ${lastError}`)
    }

    // Delay antar item — respek rate limit Resend
    await sleep(delayBetween)
  }
}

// ─── Helper: catat error ke alert_log (Dead Letter Queue) ────────────────────

async function recordWAError(alertLogId: string, reason: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { error_wa: reason })
  } catch (err) {
    console.error('[alert-queue:wa] Gagal catat DLQ error:', alertLogId, err)
  }
}

async function recordEmailError(alertLogId: string, reason: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { error_email: reason })
  } catch (err) {
    console.error('[alert-queue:email] Gagal catat DLQ error:', alertLogId, err)
  }
}

// ─── Helper: sleep ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
