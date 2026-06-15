// app/dashboard/superadmin/settings/monitoring/page.tsx
// M06 — Pengaturan Monitoring
// Route: /dashboard/superadmin/settings/monitoring
// Menu induk: KONFIGURASI (bukan Monitoring) — keputusan final S#280
// Breadcrumb: Konfigurasi > Monitoring
//
// Dibuat: Sesi #283 — LANGKAH 2 Monitoring Pages
// Pola: IDENTIK dengan security-login/page.tsx + platform-general/page.tsx
//   - getConfigPageItems('monitoring') → ConfigGroup[] → ConfigPageClient
//   - Simpan via /api/config/bulk (existing route, tidak ada perubahan)
//   - adminCanChange = false semua (monitoring SA-only, tenant_can_override=false)

export const dynamic = 'force-dynamic'

import { getConfigPageItems }  from '@/lib/config-registry'
import { mapTipe, mapValue }   from '@/lib/utils/config-page.utils'
import { ConfigPageClient }    from '../security-login/ConfigPageClient'
import type { ConfigItemData } from '@/components/ConfigItem'

export default async function MonitoringSettingsPage() {
  const rows = await getConfigPageItems('monitoring')

  // Kelompokkan per kategori → format ConfigGroup[]
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of rows) {
    const kat       = row.kategori    ?? 'Monitoring'
    const policyKey = row.policy_key  ?? row.feature_key

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: row.feature_key, items: [] })
    }

    const item: ConfigItemData = {
      id:                       row.id,
      label:                    row.label,
      fieldName:                policyKey,
      type:                     mapTipe(row.tipe_data, policyKey),
      value:                    mapValue(row.nilai, row.tipe_data),
      options:                  row.nilai_enum ?? undefined,
      valueType:                undefined,
      perRoleOptions:           undefined,
      allowedRoles:             undefined,
      hideTenantOverrideToggle: true,   // monitoring SA-only, sembunyikan toggle tenant
      option_group_id:          null,
      adminCanChange:           false,  // tenant_can_override=false semua item
      enabled:                  row.is_active ?? true,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
