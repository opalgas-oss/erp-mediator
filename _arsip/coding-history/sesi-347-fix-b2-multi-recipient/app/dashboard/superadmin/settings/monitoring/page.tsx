// app/dashboard/superadmin/settings/monitoring/page.tsx
// M06 — Pengaturan Monitoring
// Route: /dashboard/superadmin/settings/monitoring
// Menu induk: KONFIGURASI (bukan Monitoring) — keputusan final S#280
// Breadcrumb: Konfigurasi > Monitoring
//
// Dibuat: Sesi #283 — LANGKAH 2 Monitoring Pages
// PERUBAHAN S#337 — FIX-1:
//   Tambah section Alert via getConfigItemsByKategori('Alert').
//   Sebelumnya hanya getConfigPageItems('monitoring') → 11 config alert.* tidak pernah tampil.
//   Sekarang: 2 query paralel — Monitoring (feature_key='monitoring' + capacity_*) + Alert (kategori='Alert').
//   SA bisa lihat + edit semua 12 item Alert dari halaman ini.

export const dynamic = 'force-dynamic'

import { getConfigPageItems, getConfigItemsByKategori } from '@/lib/config-registry'
import { mapTipe, mapValue }                            from '@/lib/utils/config-page.utils'
import { ConfigPageClient }                             from '../security-login/ConfigPageClient'
import type { ConfigItemData }                          from '@/components/ConfigItem'

export default async function MonitoringSettingsPage() {
  // Dua query paralel — tidak saling blocking
  const [monitoringRows, alertRows] = await Promise.all([
    getConfigPageItems('monitoring'),
    getConfigItemsByKategori('Alert'),
  ])

  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  // Helper: proses satu row ke groupMap
  function processRow(row: typeof monitoringRows[0]) {
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
      hideTenantOverrideToggle: true,   // monitoring + alert SA-only, sembunyikan toggle tenant
      option_group_id:          null,
      adminCanChange:           false,  // tenant_can_override=false semua item
      enabled:                  row.is_active ?? true,
    }

    groupMap.get(kat)!.items.push(item)
  }

  // Proses Monitoring rows (feature_key='monitoring' + capacity_* + vercel_plan)
  for (const row of monitoringRows) {
    processRow(row)
  }

  // Proses Alert rows (kategori='Alert') — section terpisah di bawah Monitoring
  for (const row of alertRows) {
    processRow(row)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
