// lib/services/alert-queue.service.ts
// Service: Queue notifikasi alert via Upstash Redis (M6) — SISI TULIS (enqueue)
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
// PERUBAHAN S#374 — PEMECAHAN FILE:
//   Sisi DRAIN (drainQueues + pengiriman WA/Email + DLQ + sleep) DIPINDAH ke
//   lib/services/alert-queue-drain.service.ts — logika nol berubah, pindah murni.
//   Alasan: file ini sudah 9,79 KB dari batas kode 10 KB (keputusan arsitektur
//   S#055+#061); instrumentasi TC-3 tidak muat. Pecah by kategori (ATURAN 31),
//   pola sama seperti S#347 (alert-helpers) dan S#295 (collectors/).
//
//   Pembagian sekarang:
//     alert-queue.service.ts       → sisi TULIS: enqueueWA / enqueueEmail, tipe, key Redis
//     alert-queue-drain.service.ts → sisi BACA : drainQueues (dipanggil cron)
//
//   Config keys drain (fonnte_delay_seconds, resend_*) didokumentasikan di file drain —
//   di tempat yang benar-benar membacanya.
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'
import { getRedisClient } from '@/lib/redis'

// ─── Redis key constants ──────────────────────────────────────────────────────
// Diekspor sejak S#374: dipakai juga oleh alert-queue-drain.service.ts (sisi baca).
// Satu sumber kebenaran untuk nama key — DILARANG menulis ulang string ini di file lain (ATURAN 19).

export const QUEUE_KEY_WA    = 'alert:queue:wa'
export const QUEUE_KEY_EMAIL = 'alert:queue:email'

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
