// app/dashboard/superadmin/settings/sistem/page.tsx
// Halaman konfigurasi Sistem — SuperAdmin Dashboard.
// Membaca config items dari config_registry (feature_key='sistem').
// Platform-only (tenant_id IS NULL) — hanya SuperAdmin yang bisa ubah (tenant_can_override=false).
//
// Grup (kategori):
//   "Maintenance" (7): maintenance_mode, maintenance_title, maintenance_message (rujuk Message Library),
//                      maintenance_illustration (preset/upload), maintenance_theme, maintenance_eta,
//                      maintenance_show_contact
//   "Upload" (2):      max_upload_size_mb, allowed_upload_types
//   "Tampilan" (1):    default_page_size
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA page #1 `sistem` (isi field disetujui S#411, GATE dibuka S#412).
// Pola identik dengan platform-general/page.tsx: getConfigPageItems → ConfigPageClient generik.
// Anti-hardcode (K-411-3): nilai dari config_registry; file ilustrasi → Supabase Storage (bucket maintenance-assets).
// Catatan: field maintenance_illustration=='upload' + fungsi unggah = komponen khusus (menyusul); saat ini
//          field select generik menampilkan preset/upload sebagai dropdown.

export const dynamic = 'force-dynamic'

import { getConfigPageItems }  from '@/lib/config-registry'
import { ConfigPageClient }    from '../security-login/ConfigPageClient'
import { mapTipe, mapValue }   from '@/lib/utils/config-page.utils'
import type { ConfigItemData } from '@/components/ConfigItem'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SistemPage() {
  // getConfigPageItems: full row data, tidak filter is_active (SA lihat semua — pola S#110)
  const rows = await getConfigPageItems('sistem')

  // Kelompokkan per kategori → format ConfigGroup[]
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of rows) {
    const kat        = row.kategori    ?? 'Sistem'
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
      adminCanChange:  false, // sistem = platform-only, tidak bisa di-override tenant
      hideTenantOverrideToggle: true, // semua item SA-only, toggle AT tidak relevan ditampilkan
      enabled:         row.is_active,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
