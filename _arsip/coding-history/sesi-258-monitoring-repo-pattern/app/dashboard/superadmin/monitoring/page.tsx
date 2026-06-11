// app/dashboard/superadmin/monitoring/page.tsx
// Halaman Monitoring Dashboard — PL-S09
// RSC: fetch snapshot awal L1+L4 → pass ke MonitoringClient
// SSE untuk L2 realtime dikerjakan MonitoringClient di sisi client
//
// Dibuat: Sesi #153 — PL-S09 Step 3.6
// Update S#164 — T-032:
//   - Tambah fetch config_registry WHERE feature_key='monitoring' (10 key)
//   - Format sebagai ConfigGroup[] dengan mapTipe + mapValue
//   - Pass sebagai prop initialMonitoringConfig ke MonitoringClient
//   - SA bisa edit threshold, interval, WA/email alert langsung dari halaman ini

export const dynamic = 'force-dynamic'

import { getMonitoringSnapshot } from '@/lib/services/monitoring.service'
import { getRecentAlertLogs }    from '@/lib/services/monitoring.service'
import { getAlertRules }         from '@/lib/services/monitoring.service'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { mapTipe, mapValue }     from '@/lib/utils/config-page.utils'
import { MonitoringClient }      from './MonitoringClient'
import type { ConfigItemData }   from '@/components/ConfigItem'

// ─── Tipe ConfigGroup — konsisten dengan MonitoringClient + ConfigPageClient ──

interface ConfigGroup {
  title:       string
  feature_key: string
  items:       ConfigItemData[]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonitoringPage() {
  try {
    const db = createServerSupabaseClient()

    const [snapshot, alertLogs, alertRules, configResult] = await Promise.all([
      getMonitoringSnapshot(),
      getRecentAlertLogs(20),
      getAlertRules(),
      // T-032: fetch 10 config monitoring untuk form edit
      db
        .from('config_registry')
        .select('*')
        .eq('feature_key', 'monitoring')
        .is('tenant_id', null)
        .order('label', { ascending: true }),
    ])

    // Format config_registry rows → ConfigGroup[] untuk ConfigPageClient
    const configItems: ConfigItemData[] = (configResult.data ?? []).map(row => ({
      id:              row.id       as string,
      label:           row.label    as string,
      fieldName:       (row.policy_key as string | null) ?? (row.feature_key as string),
      type:            mapTipe(row.tipe_data as string, (row.policy_key as string | null) ?? undefined),
      value:           mapValue(row.nilai as string, row.tipe_data as string),
      options:         (row.nilai_enum as string[] | null) ?? undefined,
      valueType:       undefined,
      perRoleOptions:  undefined,
      option_group_id: null,
      adminCanChange:  false, // monitoring config = platform-only, tidak bisa di-override tenant
      enabled:         row.is_active as boolean,
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
          Gagal memuat data monitoring. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
