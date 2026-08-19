// app/api/monitoring/metrics/route.ts
// GET — Snapshot status semua sistem + alert count (untuk L1 badge grid + L4 tabel)
// Dipanggil oleh: MonitoringClient.tsx saat halaman load + polling manual
// Dibuat: Sesi #153 — PL-S09 Step 3.5
// PERUBAHAN S#460 (butir R5-b — berkas 2 dari 5): + status heartbeat M7 lapis 2 ke payload.
//   Sebabnya: lib/services/alert-heartbeat.service.ts sejak awal MERANCANG route ini sebagai
//   pembacanya (tertulis di kepala berkas itu), tetapi sambungannya tidak pernah dipasang.
//   Diukur S#460: getHeartbeatStatus() = NOL pemanggil di sapuan 122 berkas / 793.137 B.
//   Field baru bersifat TAMBAHAN — nol field lama diubah, diganti nama, atau dihapus.

import { NextResponse }          from 'next/server'
import { requireSuperAdmin }     from '@/lib/auth-server'
import { getMonitoringSnapshot } from '@/lib/services/monitoring.service'
import { getRecentAlertLogs }    from '@/lib/services/monitoring.service'
import { getHeartbeatStatus }    from '@/lib/services/alert-heartbeat.service'

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  try {
    const [snapshot, alertLogs, heartbeat] = await Promise.all([
      getMonitoringSnapshot(),
      getRecentAlertLogs(20),
      // Sengaja diberi .catch() sendiri: kegagalan membaca denyut TIDAK BOLEH menjatuhkan
      // seluruh layar pemantauan jadi 500. Gagal baca -> heartbeat = null, sisanya tetap tampil.
      getHeartbeatStatus().catch((err) => {
        console.warn('[GET /api/monitoring/metrics] getHeartbeatStatus gagal:', err)
        return null
      }),
    ])

    return NextResponse.json({
      success:    true,
      systems:    snapshot.systems,
      alertCount: snapshot.alertCount,
      alertLogs,
      updatedAt:  snapshot.updatedAt,
      // M7 lapis 2 — sumber spanduk "pemantauan tidak berdenyut" di SystemBadgeGrid.tsx.
      // Bentuk: { lastRunAt, minutesAgo, hoursAgo, isStale, graceMinutes } | null
      // PERINGATAN untuk pemakai di UI: gerbang tampil WAJIB bertumpu pada `isStale`,
      // BUKAN pada ada-tidaknya angka. Saat cron belum pernah berdenyut atau Redis mati,
      // isStale = true sementara minutesAgo DAN hoursAgo keduanya null (T-460-10).
      heartbeat,
    })
  } catch (err) {
    console.error('[GET /api/monitoring/metrics]', err)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data monitoring' },
      { status: 500 }
    )
  }
}
