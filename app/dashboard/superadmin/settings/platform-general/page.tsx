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

export const dynamic = 'force-dynamic'

import { createServerSupabaseClient }              from '@/lib/supabase-server'
import { ConfigPageClient }                        from '../security-login/ConfigPageClient'
import { mapTipe, mapValue }                       from '@/lib/utils/config-page.utils'
import type { ConfigItemData }                     from '@/components/ConfigItem'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PlatformGeneralPage() {
  const db = createServerSupabaseClient()

  // SuperAdmin wajib lihat SEMUA item (aktif maupun tidak) — per pola S#110.
  // Filter is_active hanya dipakai saat sistem mengeksekusi feature di runtime.
  const { data } = await db
    .from('config_registry')
    .select('*')
    .eq('feature_key', 'platform_general')
    .is('tenant_id', null)
    .order('label', { ascending: true })

  // Kelompokkan per kategori → format ConfigGroup[]
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of data ?? []) {
    const kat        = (row.kategori    as string | null) ?? 'Platform General'
    const policyKey  = (row.policy_key  as string | null) ?? (row.feature_key as string)
    const tipeData   = row.tipe_data    as string
    const featureKey = row.feature_key  as string

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: featureKey, items: [] })
    }

    const item: ConfigItemData = {
      id:              row.id       as string,
      label:           row.label    as string,
      fieldName:       policyKey,
      type:            mapTipe(tipeData, policyKey),
      value:           mapValue(row.nilai as string, tipeData),
      options:         (row.nilai_enum as string[] | null) ?? undefined,
      valueType:       undefined,
      perRoleOptions:  undefined,
      option_group_id: null,
      adminCanChange:  false, // platform_general = platform-only, tidak bisa di-override tenant
      enabled:         row.is_active as boolean,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())

  return <ConfigPageClient initialData={initialData} />
}
