// app/dashboard/superadmin/monitoring/page.tsx
// Halaman Monitoring Dashboard — PL-S09
// RSC: fetch snapshot awal L1+L4 → pass ke MonitoringClient
// SSE untuk L2 realtime dikerjakan MonitoringClient di sisi client
//
// Dibuat: Sesi #153 — PL-S09 Step 3.6

export const dynamic = 'force-dynamic'

import { getMonitoringSnapshot } from '@/lib/services/monitoring.service'
import { getRecentAlertLogs }    from '@/lib/services/monitoring.service'
import { getAlertRules }         from '@/lib/services/monitoring.service'
import { MonitoringClient }      from './MonitoringClient'

export default async function MonitoringPage() {
  try {
    const [snapshot, alertLogs, alertRules] = await Promise.all([
      getMonitoringSnapshot(),
      getRecentAlertLogs(20),
      getAlertRules(),
    ])

    return (
      <MonitoringClient
        initialSystems={snapshot.systems}
        initialAlertCount={snapshot.alertCount}
        initialAlertLogs={alertLogs}
        initialAlertRules={alertRules}
        initialUpdatedAt={snapshot.updatedAt}
      />
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data monitoring. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
