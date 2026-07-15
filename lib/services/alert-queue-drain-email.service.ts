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
// Instrumentasi INSTR-TC4 (S#375, HUTANG-INSTR-EMAIL): 1 baris ringkasan JSON per drain —
//   jumlah percobaan per item + jeda backoff NYATA + jeda antar item + keempat config yang
//   terbaca. Alasannya sama seperti INSTR-TC3 di kanal WA: tanpa alat ukur, keempat config
//   di atas hanya bisa DIKIRA (alert_log cuma simpan hasil akhir per alert, bukan jejak
//   percobaan per penerima; jalur sukses tak mencatat apa pun). Sifat: pengamatan murni —
//   logika pengiriman, urutan, dan penanganan error NOL berubah.
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

  // INSTR-TC4 S#375: variabel pengamatan — tidak dibaca logika pengiriman/retry
  const drainStart = Date.now()
  const jedaAntarItem: number[] = []
  const ringkasanItem: Array<{
    target_tersamar:       string
    percobaan:             number
    sukses:                boolean
    jeda_backoff_nyata_ms: number[]
    alasan_terakhir:       string | null
  }> = []
  let itemSebelumnyaAt = 0
  let sukses = 0
  let gagal  = 0

  let item: AlertQueueItemEmail | null
  while ((item = await redis.lpop<AlertQueueItemEmail>(QUEUE_KEY_EMAIL)) !== null) {
    if (!item?.targetEmail || !item?.subject) {
      console.error('[alert-queue:email] Item tidak valid (field kurang):', item)
      continue
    }

    // INSTR-TC4: jarak nyata antar AWAL pemrosesan item berturut-turut.
    // Nilai = durasi total item sebelumnya + sleep(delayBetween), jadi selalu >= delayBetween.
    const itemAt = Date.now()
    if (itemSebelumnyaAt > 0) jedaAntarItem.push(itemAt - itemSebelumnyaAt)
    itemSebelumnyaAt = itemAt

    // Retry dengan exponential backoff
    let attempt = 0
    let success = false
    let lastError = ''

    // INSTR-TC4: pengamatan per item — tidak dibaca logika retry
    let percobaanSebelumnyaAt = 0
    const jedaBackoffNyata: number[] = []

    while (attempt < maxRetries && !success) {
      // INSTR-TC4: jarak nyata antar AWAL percobaan berturut-turut untuk item ini.
      // Nilai = durasi panggilan Resend sebelumnya + sleep(backoff), jadi selalu >= backoff.
      const percobaanAt = Date.now()
      if (percobaanSebelumnyaAt > 0) jedaBackoffNyata.push(percobaanAt - percobaanSebelumnyaAt)
      percobaanSebelumnyaAt = percobaanAt

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
      sukses++
      await recordEmailSuccess(item.alertLogId)
    } else {
      gagal++
      await recordEmailError(item.alertLogId, `Gagal setelah ${maxRetries}x retry: ${lastError}`)
    }

    // INSTR-TC4: catatan per item. `percobaan` diturunkan dari jumlah jeda + 1 = jumlah
    // percobaan yang BENAR-BENAR dimulai (bukan dari counter logika retry) — angka hasil
    // pengamatan, bukan angka yang diklaim kode tentang dirinya sendiri.
    // Alamat disamarkan: cukup untuk membedakan penerima, tanpa menaruh alamat penuh di log.
    ringkasanItem.push({
      target_tersamar:       item.targetEmail.slice(0, 3) + '***',
      percobaan:             jedaBackoffNyata.length + 1,
      sukses:                success,
      jeda_backoff_nyata_ms: jedaBackoffNyata,
      alasan_terakhir:       success ? null : lastError.slice(0, 120),
    })

    // Delay antar item — respek rate limit Resend
    await sleep(delayBetween)
  }

  // INSTR-TC4: satu baris ringkasan per drain (pola sama INSTR-TC3 di kanal WA).
  // - JSON.stringify: seluruh bukti muat dalam SATU baris console.log
  //   (get_runtime_logs MCP hanya kembalikan console.log pertama per request)
  // - Diam total kalau queue kosong: tidak menambah kebisingan log cron tiap menit
  if (sukses + gagal > 0) {
    console.log('[alert-queue:email] drain-selesai ' + JSON.stringify({
      sukses,
      gagal,
      config_resend_rate_per_second:    cfg['resend_rate_per_second']    ?? '(kosong, pakai default 2)',
      config_resend_max_retries:        cfg['resend_max_retries']        ?? '(kosong, pakai default 3)',
      config_resend_backoff_initial_ms: cfg['resend_backoff_initial_ms'] ?? '(kosong, pakai default 1000)',
      config_resend_backoff_max_ms:     cfg['resend_backoff_max_ms']     ?? '(kosong, pakai default 30000)',
      delay_antar_item_terpakai_ms:     delayBetween,
      jeda_nyata_antar_item_ms:         jedaAntarItem,
      item:                             ringkasanItem,
      total_drain_ms:                   Date.now() - drainStart,
    }))
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
