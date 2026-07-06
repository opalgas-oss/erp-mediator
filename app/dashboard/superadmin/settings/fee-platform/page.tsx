// app/dashboard/superadmin/settings/fee-platform/page.tsx
// Halaman konfigurasi Fee Platform — SuperAdmin Dashboard.
// Membaca 6 config items dari config_registry (feature_key='fee_default').
// Semua items platform-only (tenant_id IS NULL) — hanya SuperAdmin yang bisa ubah.
//
// Items (kategori "Fee"):
//   - komisi_persen      → input number (%)
//   - proses_flat        → input number (Rp)
//   - gateway_persen     → input number (%)
//   - gateway_flat       → input number (Rp)
//   - ppn_persen         → input number (%)
//   - fee_berlaku_mulai  → input string (YYYY-MM-DD)
//
// Dibuat: Sesi #321 — Fee Structure Engine anti-hardcode (L-09 GAP-01 fix)
// Pola: identik dengan platform-general/page.tsx (getConfigPageItems + ConfigPageClient)

export const dynamic = 'force-dynamic'

import { getConfigPageItems }  from '@/lib/config-registry'
import { ConfigPageClient }    from '../security-login/ConfigPageClient'
import { mapTipe, mapValue }   from '@/lib/utils/config-page.utils'
import type { ConfigItemData } from '@/components/ConfigItem'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FeePlatformPage() {
  // getConfigPageItems: full row data, tidak filter is_active (SA lihat semua — pola S#110)
  const rows = await getConfigPageItems('fee_default')

  // Kelompokkan per kategori → format ConfigGroup[]
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of rows) {
    const kat        = row.kategori    ?? 'Fee Platform'
    const policyKey  = row.policy_key  ?? row.feature_key
    const tipeData   = row.tipe_data
    const featureKey = row.feature_key

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: featureKey, items: [] })
    }

    const item: ConfigItemData = {
      id:              row.id,
      label:           row.label,
      fieldName:       policyKey,
      type:            mapTipe(tipeData, policyKey),
      value:           mapValue(row.nilai, tipeData),
      options:         row.nilai_enum ?? undefined,
      valueType:       undefined,
      perRoleOptions:  undefined,
      option_group_id: null,
      adminCanChange:  false, // fee_default = platform-only, tidak bisa di-override tenant
      hideTenantOverrideToggle: true, // SA-only, toggle AT tidak relevan
      enabled:         row.is_active,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
