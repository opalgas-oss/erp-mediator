// lib/services/alert-heartbeat.service.ts
// Service: dead-man's switch heartbeat (M7) — cron monitoring anti-mati-diam-diam
// Dipakai oleh: metrics-collector.service.ts (dipanggil di akhir collectL1Metrics) — pingHeartbeat()
// KOREKSI S#460 (T-460-9): baris di bawah ini SEBELUMNYA berbunyi
//   "app/api/monitoring/metrics/route.ts (baca last_run_at untuk banner)".
//   Itu TIDAK BENAR — route tersebut tidak pernah memanggil getHeartbeatStatus().
//   Diukur S#460: sapuan 122 berkas / 793.137 B ⇒ getHeartbeatStatus() = NOL pemanggil.
//   Baris itu dikoreksi, bukan dihapus, supaya jejak klaim palsunya tidak ikut hilang.
// Dibuat: Sesi #331 — FASE 1 Alert Monitoring
// PERUBAHAN S#337 — FIX-healthchecks-config:
//   pingHeartbeat(): baca ping URL dari config_registry key alert.healthchecks_ping_url
//     (sebelumnya: process.env.HEALTHCHECKS_PING_URL — melanggar ATURAN 8)
//   getHeartbeatStatus(): fix feature_key getConfigValues dari 'alert' ke
//     'alert.heartbeat_grace_minutes' agar cocok dengan format key di DB
// PERUBAHAN S#368 — F0 namespace konsolidasi (MEMBATALKAN pola majemuk S#337):
//   config alert dikonsolidasi ke feature_key='alert' policy_key bare.
//   pingHeartbeat:      getConfigValue('alert','healthchecks_ping_url','')
//   getHeartbeatStatus: getConfigValue('alert','heartbeat_grace_minutes','180')
//
// Dua lapis M7:
//   Lapis 1 (eksternal): ping URL Healthchecks.io setelah cron sukses.
//                        Kalau ping tidak datang dalam grace time → Healthchecks.io kirim alert.
//                        URL dari config_registry key alert.healthchecks_ping_url (bukan hardcode/env).
//   Lapis 2 (internal):  simpan last_run_at ke Redis (key: monitoring:heartbeat:last_run_at).
//                        RANCANGAN: API /monitoring/metrics membaca ini → spanduk peringatan di UI.
//   ⚠️ KEADAAN NYATA S#460: rancangan lapis 2 BELUM tersambung. Spanduknya SUDAH ADA di
//      app/dashboard/superadmin/monitoring/SystemBadgeGrid.tsx (baris 20-21 prop, 82 gerbang,
//      92-96 dan 115-119 dua jalur render), tetapi (a) route API tidak memanggil fungsi ini dan
//      (b) MonitoringClient.tsx baris 138-141 tidak meneruskan propnya ⇒ spanduk mustahil tampil.
//      Butir R5-b (S#460) menyambung ketiga sambungan itu. Berkas ini = langkah 1 dari 5.
//
// Grace time dari config_registry: feature_key='alert' policy_key='heartbeat_grace_minutes' (default 180 menit = 3 jam).
// SA bisa ubah kedua nilai ini dari Dashboard → Konfigurasi → Monitoring → section Alert.

import 'server-only'
import { getRedisClient }  from '@/lib/redis'
import { getConfigValue }  from '@/lib/config-registry'

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
 *
 * URL Healthchecks.io dibaca dari config_registry (feature_key='alert', policy_key='healthchecks_ping_url').
 * Jika nilai kosong atau belum diisi SA, skip ping dengan diam (tidak throw).
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
  // URL dari config_registry — SA kelola via Dashboard → Konfigurasi → Monitoring → Alert
  // Jika nilai kosong (belum diisi), skip dengan diam (tidak throw)
  let pingUrl: string | null = null
  try {
    pingUrl = await getConfigValue(
      'alert',
      'healthchecks_ping_url',
      ''
    )
  } catch {
    // config_registry tidak tersedia — skip ping, jangan crash cron
    return
  }

  if (!pingUrl || pingUrl.trim() === '') return

  try {
    await fetch(pingUrl, { method: 'GET', cache: 'no-store' })
  } catch (err) {
    // Non-critical — jangan throw, cron tetap berhasil
    console.warn('[heartbeat] Gagal ping Healthchecks.io:', err)
  }
}

// ─── getHeartbeatStatus (M7 — dibaca API untuk banner internal) ──────────────

/**
 * Baca last_run_at dari Redis + hitung selang waktu yang sudah lewat.
 * DIRANCANG dipakai /api/monitoring/metrics untuk spanduk peringatan ke SA.
 * ⚠️ Sampai R5-b (S#460) selesai, fungsi ini NOL pemanggil — lihat koreksi di kepala berkas.
 *
 * TAMBAHAN S#460 (T-460-8): field `minutesAgo`.
 *   Sebabnya terukur, bukan selera: `isStale` dihitung dari MENIT (`minutesRaw > graceMinutes`),
 *   sedangkan satu-satunya field selang waktu yang tersedia dulu adalah `hoursAgo` yang
 *   di-`Math.floor` ke JAM. Sejak S#459 nilai config `alert.heartbeat_grace_minutes` = 30 menit,
 *   jadi `isStale` bisa true pada menit ke-31 sementara `hoursAgo` bernilai 0 ⇒ UI yang memakai
 *   `hoursAgo` akan menulis "tidak aktif sejak 0 jam lalu". Benar secara kode, tidak berguna
 *   di mata SA. `minutesAgo` menutup celah itu tanpa mengubah `hoursAgo` maupun `isStale`.
 *
 * @returns {
 *   lastRunAt:    ISO string atau null jika belum pernah
 *   minutesAgo:   menit sejak last run, dibulatkan ke bawah (null jika belum pernah)
 *   hoursAgo:     jam sejak last run (0 jika < 1 jam, null jika belum pernah) — DIPERTAHANKAN
 *   isStale:      true jika lewat ambang grace time
 *   graceMinutes: nilai dari config_registry
 * }
 * ⚠️ Perhatian pemakai UI: saat cron BELUM PERNAH berdenyut, `isStale` = true tetapi
 *    `minutesAgo` DAN `hoursAgo` keduanya null. Gerbang tampil WAJIB bertumpu pada `isStale`,
 *    bukan pada ada-tidaknya angka — kalau tidak, justru keadaan TERBURUK yang paling senyap.
 */
export async function getHeartbeatStatus(): Promise<{
  lastRunAt:    string | null
  minutesAgo:   number | null
  hoursAgo:     number | null
  isStale:      boolean
  graceMinutes: number
}> {
  // Baca grace minutes dari config_registry (ATURAN 8 — anti hardcode)
  // feature_key='alert' policy_key='heartbeat_grace_minutes' (F0 S#368 — namespace konsolidasi)
  let graceMinutes = 180
  try {
    const val = await getConfigValue(
      'alert',
      'heartbeat_grace_minutes',
      '180'
    )
    graceMinutes = parseInt(val ?? '180', 10)
  } catch {
    // fallback ke default jika config tidak tersedia
  }

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
    return { lastRunAt: null, minutesAgo: null, hoursAgo: null, isStale: true, graceMinutes }
  }

  if (!lastRunAt) {
    return { lastRunAt: null, minutesAgo: null, hoursAgo: null, isStale: true, graceMinutes }
  }

  const minutesRaw = (Date.now() - new Date(lastRunAt).getTime()) / 60_000
  const minutesAgo = Math.floor(minutesRaw)
  const hoursAgo   = Math.floor(minutesRaw / 60)
  const isStale    = minutesRaw > graceMinutes

  return { lastRunAt, minutesAgo, hoursAgo, isStale, graceMinutes }
}
