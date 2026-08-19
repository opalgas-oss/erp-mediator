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
// Fix S#258 — T-S258-02 (Repository Pattern):
//   - Hapus direct db.from('config_registry') di RSC page (pelanggaran identik PV-09/PV-10
//     yang sudah difix S#177 di settings pages, tapi monitoring TERLEWAT)
//   - Ganti dengan getConfigPageItems('monitoring') dari lib/config-registry
//   - Hapus import createServerSupabaseClient (tidak dipakai lagi)
//   - getConfigPageItems sudah ber-cache (unstable_cache TTL 300s tag 'config') + tidak
//     filter is_active (SA lihat semua, pola S#110) — konsisten dgn 3 settings pages

export const dynamic = 'force-dynamic'

import { getMonitoringSnapshot } from '@/lib/services/monitoring.service'
import { getRecentAlertLogsWithImpact } from '@/lib/services/monitoring.service'
import { getAlertRules }         from '@/lib/services/monitoring.service'
import { getConfigPageItems }    from '@/lib/config-registry'
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
    const [snapshot, alertLogs, alertRules, configRows] = await Promise.all([
      getMonitoringSnapshot(),
      getRecentAlertLogsWithImpact(20),   // B3 S#349 — dengan business_impact + provider_nama
      getAlertRules(),
      // T-032 (fix S#258 T-S258-02): fetch 10 config monitoring via repository layer
      getConfigPageItems('monitoring'),
    ])

    // Format config_registry rows → ConfigGroup[] untuk ConfigPageClient
    // configRows bertipe ConfigRegistryFullItem[] — kolom sudah ber-tipe, tanpa casting
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
      adminCanChange:  false, // monitoring config = platform-only, tidak bisa di-override tenant
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
          Gagal memuat data monitoring. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
