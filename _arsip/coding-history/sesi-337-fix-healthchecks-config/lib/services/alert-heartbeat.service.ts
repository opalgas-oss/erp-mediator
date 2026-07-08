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

export async function pingHeartbeat(): Promise<void> {
  const now = new Date().toISOString()

  try {
    const redis = await getRedisClient()
    if (redis) {
      await redis.set(HEARTBEAT_REDIS_KEY, now, { ex: HEARTBEAT_TTL_SEC })
    }
  } catch (err) {
    console.warn('[heartbeat] Gagal simpan last_run_at ke Redis:', err)
  }

  const pingUrl = process.env.HEALTHCHECKS_PING_URL
  if (!pingUrl) return

  try {
    await fetch(pingUrl, { method: 'GET', cache: 'no-store' })
  } catch (err) {
    console.warn('[heartbeat] Gagal ping Healthchecks.io:', err)
  }
}

export async function getHeartbeatStatus(): Promise<{
  lastRunAt:    string | null
  hoursAgo:     number | null
  isStale:      boolean
  graceMinutes: number
}> {
  const cfg          = await getConfigValues('alert')
  const graceMinutes = parseInt(cfg['heartbeat_grace_minutes'] ?? '180', 10)

  let lastRunAt: string | null = null
  try {
    const redis = await getRedisClient()
    if (redis) {
      const val = await redis.get<string>(HEARTBEAT_REDIS_KEY)
      lastRunAt = val ?? null
    }
  } catch {
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
