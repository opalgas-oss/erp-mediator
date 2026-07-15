// lib/services/alert-queue-drain-wa.service.ts
// Service: Drain kanal WA (Fonnte) — sisi BACA queue alert:queue:wa
// Dibuat: Sesi #375 — dipecah dari alert-queue-drain.service.ts (HUTANG-PECAH-KANAL-DRAIN).
//   Pindah murni: logika, urutan, dan penanganan error NOL berubah.
//   Riwayat pecah: S#374 (alert-queue -> alert-queue-drain), S#347, S#295.
//
// Alasan pecah per kanal (S#374/#375): file drain gabungan 9.551 B, sisa 689 B dari
//   batas kode 10 KB. Instrumentasi drain email (TC-4) tidak muat. Dipecah SEKARANG
//   sekalian — kalau ditunda, HUTANG-SILENT-CATCH (jalur tak-tertonton: cron/after())
//   pasti membuka file ini dan terpaksa memecahnya duluan = kode dipindah dua kali.
//
// Pembagian tanggung jawab (by kategori, ATURAN 31):
//   alert-queue.service.ts             sisi TULIS : enqueueWA / enqueueEmail, tipe, key Redis
//   alert-queue-drain.service.ts       ORKESTRATOR: drainQueues (dipanggil cron)
//   alert-queue-drain-wa.service.ts    kanal WA    (file ini)
//   alert-queue-drain-email.service.ts kanal Email
//
// Config yang dibaca (config_registry, feature_key='alert' — hasil F0 namespace S#369):
//   fonnte_delay_seconds
//
// INSTR-TC3 (S#374): 1 baris ringkasan JSON per drain — sebelumnya jeda antar-WA tidak
//   bisa dibuktikan, hanya dikira (alert_log tidak simpan waktu per penerima, jalur sukses
//   tidak mencatat apa pun, jam terima WA presisi menit). Sifat: pengamatan murni.
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'
import { getRedisClient }  from '@/lib/redis'
import { getConfigValues } from '@/lib/config-registry'
import { getCredential }   from '@/lib/services/credential.service'
import { sendFonnteWA }    from '@/lib/utils/fonnte.server'
import { sleep }           from '@/lib/utils/async.utils'
import { updateAlertLogNotifResult } from '@/lib/repositories/alert-log.repository'
import { QUEUE_KEY_WA } from '@/lib/services/alert-queue.service'
import type { AlertQueueItemWA } from '@/lib/services/alert-queue.service'

// ─── drainWAQueue ────────────────────────────────────────────────────────────

/**
 * Drain queue WA — dipanggil dari drainQueues (orkestrator) setiap cron run.
 * Proses semua item sampai queue kosong, respek delay antar kirim sesuai config.
 * Error per item → catat ke alert_log (DLQ), tidak hentikan drain keseluruhan.
 */
export async function drainWAQueue(): Promise<void> {
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

// ─── Helper: catat error ke alert_log (Dead Letter Queue) ────────────────────

async function recordWAError(alertLogId: string, reason: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { error_wa: reason })
  } catch (err) {
    console.error('[alert-queue:wa] Gagal catat DLQ error:', alertLogId, err)
  }
}

// ─── Helper: catat sukses ke alert_log (E-2 S#356 — HUTANG-M6-SUCCESS-FLAG) ───
// Jalur sukses sebelumnya tidak menandai apa pun → sent_via_wa tampak false
// meski terkirim ("log berbohong"). Kolom sukses terpisah dari error → partial
// success (1 dari N penerima) tetap tercatat jujur.

async function recordWASuccess(alertLogId: string): Promise<void> {
  try {
    await updateAlertLogNotifResult(alertLogId, { sent_via_wa: true })
  } catch (err) {
    console.error('[alert-queue:wa] Gagal catat flag sukses:', alertLogId, err)
  }
}
