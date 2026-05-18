// app/dashboard/superadmin/settings/platform-general/page.tsx
// Halaman konfigurasi Platform General — SuperAdmin Dashboard.
// Membaca 5 config items dari config_registry (feature_key='platform_general').
// Semua items platform-only (tenant_id IS NULL) — hanya SuperAdmin yang bisa ubah.
//
// Items:
//   Kategori "Cache" (4 item, tipe number + timing suffix):
//     - redis_ttl_config_seconds      → input timing (detik)
//     - redis_ttl_credentials_seconds → input timing (detik)
//     - redis_ttl_messages_seconds    → input timing (detik)
//     - sidebar_cache_ttl_seconds     → input timing (detik)
//   Kategori "Lokalisasi" (1 item, tipe string):
//     - platform_timezone             → input text (IANA timezone string)
//
// Dibuat: Sesi #164 — T-029: buat halaman dashboard platform_general
// PERUBAHAN Sesi #177 — Fix proaktif (Repository Pattern):
//   - Hapus direct db.from('config_registry') di RSC page
//   - Ganti dengan getConfigPageItems('platform_general') dari lib/config-registry
//   - Hapus import createServerSupabaseClient (tidak dipakai lagi)

export const dynamic = 'force-dynamic'

import { getConfigPageItems }  from '@/lib/config-registry'
import { ConfigPageClient }    from '../security-login/ConfigPageClient'
import { mapTipe, mapValue }   from '@/lib/utils/config-page.utils'
import type { ConfigItemData } from '@/components/ConfigItem'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlatformGeneralPage() {
  // getConfigPageItems: full row data, tidak filter is_active (SA lihat semua — pola S#110)
  const rows = await getConfigPageItems('platform_general')

  // Kelompokkan per kategori → format ConfigGroup[]
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of rows) {
    const kat        = row.kategori    ?? 'Platform General'
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
      adminCanChange:  false, // platform_general = platform-only, tidak bisa di-override tenant
      enabled:         row.is_active,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
