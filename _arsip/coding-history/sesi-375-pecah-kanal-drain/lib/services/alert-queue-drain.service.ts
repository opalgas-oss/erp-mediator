// lib/services/alert-queue-drain.service.ts
// Service: Drain (pengiriman) queue notifikasi alert — WA (Fonnte) + Email (Resend)
// Dibuat: Sesi #374 — dipecah dari alert-queue.service.ts (ATURAN 31, batas kode 10 KB).
//   Pindah murni: logika, urutan, dan penanganan error NOL berubah.
//   Pola pecah yang sama: S#347 (alert-helpers.service.ts), S#295 (collectors/).
//
// Pembagian tanggung jawab (by kategori):
//   alert-queue.service.ts        sisi TULIS: enqueueWA / enqueueEmail, tipe, key Redis
//   alert-queue-drain.service.ts  sisi BACA : drainQueues, pengiriman, DLQ (file ini)
//
// Dipakai oleh: metrics-collector.service.ts (collectL1Metrics, di dalam after()).
//   Route collect-metrics wajib maxDuration=60 supaya drain tuntas (FIX S#359).
//
// PERUBAHAN S#374 — INSTR-TC3 (instrumentasi drain WA, lihat blok bertanda INSTR-TC3):
//   Sebelum ini jeda antar-WA tidak bisa dibuktikan, hanya dikira: alert_log tidak
//   menyimpan waktu per penerima (1 alert = 1 baris), jalur sukses tidak mencatat
//   apa pun, dan jam terima WA hanya presisi menit. Instrumentasi = 1 baris ringkasan
//   per drain. Sifat: pengamatan murni. Drain Email menyusul saat TC-4.
//
// Config keys (config_registry, feature_key='alert' — hasil F0 namespace S#369):
//   fonnte_delay_seconds, resend_rate_per_second, resend_max_retries,
//   resend_backoff_initial_ms, resend_backoff_max_ms
//
// JIKA FILE INI MENDEKATI 10 KB LAGI: pecah by kanal (drain-wa / drain-email) — jangan tambal.
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'
import { getRedisClient }       from '@/lib/redis'
import { getConfigValues }      from '@/lib/config-registry'
import { getCredential }        from '@/lib/services/credential.service'
import { sendFonnteWA }         from '@/lib/utils/fonnte.server'
import { sendResendEmailPlain } from '@/lib/utils/resend.server'
import { updateAlertLogNotifResult } from '@/lib/repositories/alert-log.repository'
import { QUEUE_KEY_WA, QUEUE_KEY_EMAIL } from '@/lib/services/alert-queue.service'
import type { AlertQueueItemWA, AlertQueueItemEmail } from '@/lib/services/alert-queue.service'

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

  const cfg         = await getConfigValues('alert')
  const delayCfgRaw = cfg['fonnte_delay_seconds']
  const delay       = parseInt(delayCfgRaw ?? '2', 10) * 1000
  const token       = await getCredential('fonnte', 'api_token')

  if (!token) {
    console.error('[alert-queue:wa] Token Fonnte tidak ada — drain dibatalkan')
    return
  }

  // INSTR-TC3 S#374: variabel pengamatan — tidak dibaca logika pengiriman
  const drainStart = Date.now()
  const jedaNyata: number[] = []
  let kirimSebelumnyaAt = 0
  let sukses = 0
  let gagal  = 0

  // LPOP satu per satu — proses sampai queue kosong.
  // @upstash/redis auto-deserialize: lpop kembalikan object, jangan JSON.parse lagi.
  let item: AlertQueueItemWA | null
  while ((item = await redis.lpop<AlertQueueItemWA>(QUEUE_KEY_WA)) !== null) {
    if (!item?.targetNumber || !item?.message) {
      console.error('[alert-queue:wa] Item tidak valid (field kurang):', item)
      continue
    }

    // INSTR-TC3: jarak nyata antar awal pengiriman berturut-turut.
    // Nilai = durasi panggilan Fonnte sebelumnya + sleep(delay), jadi selalu >= delay.
    const kirimAt = Date.now()
    if (kirimSebelumnyaAt > 0) jedaNyata.push(kirimAt - kirimSebelumnyaAt)
    kirimSebelumnyaAt = kirimAt

    try {
      const result = await sendFonnteWA(item.targetNumber, item.message, token)
      if (result.success) {
        sukses++
        await recordWASuccess(item.alertLogId)
      } else {
        gagal++
        await recordWAError(item.alertLogId, `Fonnte error: ${result.reason ?? 'Unknown'}`)
      }
    } catch (err) {
      gagal++
      const reason = err instanceof Error ? err.message : String(err)
      await recordWAError(item.alertLogId, reason)
    }

    // Delay antar item — sesuai config (supplement burst limit Fonnte)
    if (delay > 0) await sleep(delay)
  }

  // INSTR-TC3: satu baris ringkasan per drain.
  // - JSON.stringify: seluruh bukti muat dalam SATU baris console.log
  //   (get_runtime_logs MCP hanya kembalikan console.log pertama per request)
  // - Diam total kalau queue kosong: tidak menambah kebisingan log cron tiap menit
  if (sukses + gagal > 0) {
    console.log('[alert-queue:wa] drain-selesai ' + JSON.stringify({
      sukses,
      gagal,
      config_fonnte_delay_seconds: delayCfgRaw ?? '(kosong, pakai default 2)',
      delay_terpakai_ms:           delay,
      jeda_nyata_antar_wa_ms:      jedaNyata,
      total_drain_ms:              Date.now() - drainStart,
    }))
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

// ─── Helper: catat sukses ke alert_log (E-2 S#356 — HUTANG-M6-SUCCESS-FLAG) ───
// Jalur sukses sebelumnya tidak menandai apa pun → sent_via_wa/email tampak false
// meski terkirim ("log berbohong"). Kolom sukses terpisah dari error → partial
// success (1 dari N penerima) tetap tercatat jujur.

async function recordWASuccess(alertLogId: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { sent_via_wa: true })
  } catch (err) {
    console.error('[alert-queue:wa] Gagal catat flag sukses:', alertLogId, err)
  }
}

async function recordEmailSuccess(alertLogId: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { sent_via_email: true })
  } catch (err) {
    console.error('[alert-queue:email] Gagal catat flag sukses:', alertLogId, err)
  }
}

// ─── Helper: sleep ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
