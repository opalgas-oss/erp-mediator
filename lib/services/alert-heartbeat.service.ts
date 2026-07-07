// lib/services/alert-heartbeat.service.ts
// Service: dead-man's switch heartbeat (M7) — cron monitoring anti-mati-diam-diam
// Dipakai oleh: metrics-collector.service.ts (dipanggil di akhir collectL1Metrics)
//               app/api/monitoring/metrics/route.ts (baca last_run_at untuk banner)
// Dibuat: Sesi #331 — FASE 1 Alert Monitoring
//
// Dua lapis M7:
//   Lapis 1 (eksternal): ping URL Healthchecks.io setelah cron sukses.
//                        Kalau ping tidak datang dalam grace time → Healthchecks.io kirim alert.
//                        URL dari config_registry (bukan hardcode).
//   Lapis 2 (internal):  simpan last_run_at ke Redis (key: monitoring:heartbeat:last_run_at).
//                        API /monitoring/metrics membaca ini → banner merah di UI kalau terlalu lama.
//
// Grace time dari config_registry: alert.heartbeat_grace_minutes (default 180 menit = 3 jam).
// URL Healthchecks.io dari env HEALTHCHECKS_PING_URL (infrastruktur level, bukan bisnis level).

import 'server-only'
import { getRedisClient }  from '@/lib/redis'
import { getConfigValues } from '@/lib/config-registry'

const HEARTBEAT_REDIS_KEY = 'monitoring:heartbeat:last_run_at'
const HEARTBEAT_TTL_SEC   = 60 * 60 * 24 * 7 // 7 hari — cukup untuk deteksi

// ─── pingHeartbeat (M7 — dipanggil di akhir collectL1Metrics) ────────────────

/**
 * Ping dua lapis heartbeat setelah collectL1Metrics sukses:
 *   1. Simpan last_run_at ke Redis (banner internal)
 *   2. Ping URL Healthchecks.io (dead-man's switch eksternal, jika URL dikonfigurasi)
 *
 * Fire-and-forget — error tidak menghalangi cron selesai.
 * Dipanggil di akhir collectL1Metrics, bukan di awal.
 */
export async function pingHeartbeat(): Promise<void> {
  const now = new Date().toISOString()

  // Lapis 2 internal: simpan ke Redis
  try {
    const redis = await getRedisClient()
    if (redis) {
      await redis.set(HEARTBEAT_REDIS_KEY, now, { ex: HEARTBEAT_TTL_SEC })
    }
  } catch (err) {
    console.warn('[heartbeat] Gagal simpan last_run_at ke Redis:', err)
  }

  // Lapis 1 eksternal: ping Healthchecks.io
  // URL dari env var (infrastruktur level — CREDENTIAL_SYSTEM_SPEC BAB 2 Kategori 1)
  // Jika tidak dikonfigurasi, skip dengan diam (tidak throw)
  const pingUrl = process.env.HEALTHCHECKS_PING_URL
  if (!pingUrl) return

  try {
    await fetch(pingUrl, { method: 'GET', cache: 'no-store' })
  } catch (err) {
    // Non-critical — jangan throw, cron tetap berhasil
    console.warn('[heartbeat] Gagal ping Healthchecks.io:', err)
  }
}

// ─── getHeartbeatStatus (M7 — dibaca API untuk banner internal) ──────────────

/**
 * Baca last_run_at dari Redis + hitung jam yang sudah lewat.
 * Dipakai oleh /api/monitoring/metrics untuk menampilkan banner peringatan ke SA.
 *
 * @returns {
 *   lastRunAt:    ISO string atau null jika belum pernah
 *   hoursAgo:     jam sejak last run (0 jika < 1 jam, null jika belum pernah)
 *   isStale:      true jika lewat ambang grace time
 *   graceMinutes: nilai dari config_registry
 * }
 */
export async function getHeartbeatStatus(): Promise<{
  lastRunAt:    string | null
  hoursAgo:     number | null
  isStale:      boolean
  graceMinutes: number
}> {
  // Baca grace minutes dari config_registry (ATURAN 8 — anti hardcode)
  const cfg          = await getConfigValues('alert')
  const graceMinutes = parseInt(cfg['heartbeat_grace_minutes'] ?? '180', 10)

  // Baca last_run_at dari Redis
  let lastRunAt: string | null = null
  try {
    const redis = await getRedisClient()
    if (redis) {
      const val = await redis.get<string>(HEARTBEAT_REDIS_KEY)
      lastRunAt = val ?? null
    }
  } catch {
    // Redis tidak tersedia — kembalikan status unknown
    return { lastRunAt: null, hoursAgo: null, isStale: true, graceMinutes }
  }

  if (!lastRunAt) {
    return { lastRunAt: null, hoursAgo: null, isStale: true, graceMinutes }
  }

  const minutesAgo = (Date.now() - new Date(lastRunAt).getTime()) / 60_000
  const hoursAgo   = Math.floor(minutesAgo / 60)
  const isStale    = minutesAgo > graceMinutes

  return { lastRunAt, hoursAgo, isStale, graceMinutes }
}
