// app/dashboard/superadmin/monitoring/status/page.tsx
// M01 — Status & Realtime
// Route: /dashboard/superadmin/monitoring/status
// Menampilkan: Summary UP/Degraded/Down + L1 Badge Grid + L2 Realtime (SSE)
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Pola: RSC fetch data → pass ke MonitoringClient (reuse existing, tanpa modifikasi)
// File existing yang di-reuse: MonitoringClient.tsx, monitoring.service.ts
// PERUBAHAN S#461 (R5-b — KOREKSI SASARAN): + status denyut M7 untuk tampilan PERTAMA.
//   ⚠️ KOREKSI, bukan pekerjaan baru. S#460 memilih app/dashboard/superadmin/monitoring/page.tsx
//   sebagai sasaran. Diukur S#461: halaman itu KEMBARAN penuh berkas ini (beda 5 baris, semuanya
//   kosmetik) DAN baris menunya `is_active=false` di dashboard_menus ⇒ SA tidak punya pintu ke
//   sana. Suntingan di berkas itu DIBATALKAN byte-exact, dan dipindah ke sini — berkas yang
//   benar-benar dijangkau SA lewat menu "Monitoring → Status & Health".
//   Tanpa baris ini, spanduk "pemantauan tidak berdenyut" baru muncul SESUDAH SA menekan Refresh.
//   Nol field lama diubah/dihapus; nol fungsi baru dibuat; nol ikon & nol kelas warna baru.

export const dynamic = 'force-dynamic'

import { getMonitoringSnapshot } from '@/lib/services/monitoring.service'
import { getRecentAlertLogsWithImpact } from '@/lib/services/monitoring.service'
import { getAlertRules }         from '@/lib/services/monitoring.service'
import { getConfigPageItems }    from '@/lib/config-registry'
import { getHeartbeatStatus }   from '@/lib/services/alert-heartbeat.service'
import { mapTipe, mapValue }     from '@/lib/utils/config-page.utils'
import { MonitoringClient }      from '../MonitoringClient'
import type { ConfigItemData }   from '@/components/ConfigItem'

interface ConfigGroup {
  title:       string
  feature_key: string
  items:       ConfigItemData[]
}

export default async function MonitoringStatusPage() {
  try {
    const [snapshot, alertLogs, alertRules, configRows, heartbeat] = await Promise.all([
      getMonitoringSnapshot(),
      getRecentAlertLogsWithImpact(20),   // B3 S#349
      getAlertRules(),
      getConfigPageItems('monitoring'),
      // M7 lapis 2 (S#461) — status denyut cron untuk render pertama (RSC).
      // .catch() SENDIRI, sama polanya dengan app/api/monitoring/metrics/route.ts (S#460):
      // gagal membaca denyut TIDAK BOLEH menjatuhkan seluruh halaman ke blok catch di bawah,
      // yang akan menampilkan "Gagal memuat data monitoring status" padahal 4 sumber lain sehat.
      getHeartbeatStatus().catch((err) => {
        console.warn('[MonitoringStatusPage] getHeartbeatStatus gagal:', err)
        return null
      }),
    ])

    const configItems: ConfigItemData[] = configRows.map(row => ({
      id:              row.id,
      label:           row.label,
      fieldName:       row.policy_key ?? row.feature_key,
      type:            mapTipe(row.tipe_data, row.policy_key ?? undefined),
      value:           mapValue(row.nilai, row.tipe_data),
      options:         row.nilai_enum ?? undefined,
      valueType:       undefined,
      perRoleOptions:  undefined,
      option_group_id: null,
      adminCanChange:  false,
      enabled:         row.is_active,
    }))

    const initialMonitoringConfig: ConfigGroup[] = configItems.length > 0
      ? [{ title: 'Monitoring', feature_key: 'monitoring', items: configItems }]
      : []

    return (
      <MonitoringClient
        initialSystems={snapshot.systems}
        initialAlertCount={snapshot.alertCount}
        initialAlertLogs={alertLogs}
        initialAlertRules={alertRules}
        initialUpdatedAt={snapshot.updatedAt}
        initialMonitoringConfig={initialMonitoringConfig}
        initialHeartbeat={heartbeat}
      />
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data monitoring status. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
