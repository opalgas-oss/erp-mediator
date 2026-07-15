// lib/services/alert-queue-drain-email.service.ts
// Service: Drain kanal Email (Resend) — sisi BACA queue alert:queue:email
// Dibuat: Sesi #375 — dipecah dari alert-queue-drain.service.ts (HUTANG-PECAH-KANAL-DRAIN).
//   Pindah murni: logika, urutan, dan penanganan error NOL berubah.
//   Riwayat pecah: S#374 (alert-queue -> alert-queue-drain), S#347, S#295.
//
// Pembagian tanggung jawab (by kategori, ATURAN 31):
//   alert-queue.service.ts             sisi TULIS : enqueueWA / enqueueEmail, tipe, key Redis
//   alert-queue-drain.service.ts       ORKESTRATOR: drainQueues (dipanggil cron)
//   alert-queue-drain-wa.service.ts    kanal WA
//   alert-queue-drain-email.service.ts kanal Email (file ini)
//
// Config yang dibaca (config_registry, feature_key='alert' — hasil F0 namespace S#369):
//   resend_rate_per_second, resend_max_retries, resend_backoff_initial_ms, resend_backoff_max_ms
//   → keempatnya adalah sisa bukti P0-2 yang diuji TC-4.
//
// Instrumentasi drain email (HUTANG-INSTR-EMAIL) menyusul di langkah berikutnya —
//   file ini sengaja disiapkan dengan ruang cukup untuk itu (batas kode 10 KB).
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'
import { getRedisClient }       from '@/lib/redis'
import { getConfigValues }      from '@/lib/config-registry'
import { sendResendEmailPlain } from '@/lib/utils/resend.server'
import { sleep }                from '@/lib/utils/async.utils'
import { updateAlertLogNotifResult } from '@/lib/repositories/alert-log.repository'
import { QUEUE_KEY_EMAIL } from '@/lib/services/alert-queue.service'
import type { AlertQueueItemEmail } from '@/lib/services/alert-queue.service'

// ─── drainEmailQueue ─────────────────────────────────────────────────────────

/**
 * Drain queue Email — dipanggil dari drainQueues (orkestrator) setiap cron run.
 * Proses semua item sampai queue kosong, retry per item dengan exponential backoff,
 * respek rate limit antar item sesuai config.
 * Gagal setelah N retry → catat ke alert_log (DLQ), tidak hentikan drain keseluruhan.
 */
export async function drainEmailQueue(): Promise<void> {
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

    if (success) {
      await recordEmailSuccess(item.alertLogId)
    } else {
      await recordEmailError(item.alertLogId, `Gagal setelah ${maxRetries}x retry: ${lastError}`)
    }

    // Delay antar item — respek rate limit Resend
    await sleep(delayBetween)
  }
}

// ─── Helper: catat error ke alert_log (Dead Letter Queue) ────────────────────

async function recordEmailError(alertLogId: string, reason: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { error_email: reason })
  } catch (err) {
    console.error('[alert-queue:email] Gagal catat DLQ error:', alertLogId, err)
  }
}

// ─── Helper: catat sukses ke alert_log (E-2 S#356 — HUTANG-M6-SUCCESS-FLAG) ───
// Jalur sukses sebelumnya tidak menandai apa pun → sent_via_email tampak false
// meski terkirim ("log berbohong"). Kolom sukses terpisah dari error → partial
// success (1 dari N penerima) tetap tercatat jujur.

async function recordEmailSuccess(alertLogId: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { sent_via_email: true })
  } catch (err) {
    console.error('[alert-queue:email] Gagal catat flag sukses:', alertLogId, err)
  }
}
