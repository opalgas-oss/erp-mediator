// app/dashboard/superadmin/settings/multi-role-policy/page.tsx
// Halaman konfigurasi Multi-Role Policy — SuperAdmin Dashboard.
// Membaca 15 config items dari config_registry (feature_key='multi_role_policy').
// Semua items platform-only (tenant_id IS NULL) — hanya SuperAdmin yang bisa ubah.
// Mendukung tipe: toggle (boolean), number-unit (number), json-per-role (json).
//
// Dibuat: Sesi #097 — PL-S08 M1 Config & Policy Management
// PERUBAHAN Sesi #163 — Fix T-028 (DRY):
//   - Hapus definisi lokal mapTipe, mapValue, JsonFieldConfig, ConfigItemType
//   - Import semua dari @/lib/utils/config-page.utils (satu sumber kebenaran)
// PERUBAHAN Sesi #177 — Fix PV-10 (Repository Pattern) + fix bug is_active filter:
//   - Hapus direct db.from('config_registry') di RSC page
//   - Hapus .eq('is_active', true) yang salah — SA wajib lihat semua item (pola S#110)
//   - Ganti dengan getConfigPageItems('multi_role_policy') dari lib/config-registry
//   - Hapus import createServerSupabaseClient (tidak dipakai lagi)

export const dynamic = 'force-dynamic'

import { getConfigPageItems }                      from '@/lib/config-registry'
import { ConfigPageClient }                        from '../security-login/ConfigPageClient'
import { mapTipe, mapValue, type JsonFieldConfig } from '@/lib/utils/config-page.utils'
import type { ConfigItemData }                     from '@/components/ConfigItem'

// ─── Konfigurasi tipe per field JSON per-role ─────────────────────────────────

const JSON_FIELD_CONFIG: Record<string, JsonFieldConfig> = {
  max_concurrent_sessions_per_role: { valueType: 'number' },
  notify_multi_device_login:        { valueType: 'boolean' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MultiRolePolicyPage() {
  // getConfigPageItems: full row data, tidak filter is_active (SA lihat semua — pola S#110)
  // Fix bug: sebelumnya .eq('is_active', true) menghalangi SA lihat item yang di-disable
  const rows = await getConfigPageItems('multi_role_policy')

  // Kelompokkan per kategori → format ConfigGroup[]
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of rows) {
    const kat        = row.kategori    ?? 'Multi-Role Policy'
    const policyKey  = row.policy_key  ?? row.feature_key
    const tipeData   = row.tipe_data
    const featureKey = row.feature_key

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: featureKey, items: [] })
    }

    const jsonCfg = JSON_FIELD_CONFIG[policyKey]

    const item: ConfigItemData = {
      id:              row.id,
      label:           row.label,
      fieldName:       policyKey,
      type:            mapTipe(tipeData, policyKey),
      value:           mapValue(row.nilai, tipeData),
      options:         row.nilai_enum ?? undefined,
      valueType:       jsonCfg?.valueType,
      perRoleOptions:  jsonCfg?.options,
      option_group_id: null,
      adminCanChange:  false, // multi_role_policy = platform-only, tidak bisa di-override tenant
      enabled:         row.is_active,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
