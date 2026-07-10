// app/dashboard/superadmin/monitoring/status/page.tsx
// M01 — Status & Realtime
// Route: /dashboard/superadmin/monitoring/status
// Menampilkan: Summary UP/Degraded/Down + L1 Badge Grid + L2 Realtime (SSE)
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Pola: RSC fetch data → pass ke MonitoringClient (reuse existing, tanpa modifikasi)
// File existing yang di-reuse: MonitoringClient.tsx, monitoring.service.ts

export const dynamic = 'force-dynamic'

import { getMonitoringSnapshot } from '@/lib/services/monitoring.service'
import { getRecentAlertLogsWithImpact } from '@/lib/services/monitoring.service'
import { getAlertRules }         from '@/lib/services/monitoring.service'
import { getConfigPageItems }    from '@/lib/config-registry'
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
    const [snapshot, alertLogs, alertRules, configRows] = await Promise.all([
      getMonitoringSnapshot(),
      getRecentAlertLogsWithImpact(20),   // B3 S#349
      getAlertRules(),
      getConfigPageItems('monitoring'),
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
