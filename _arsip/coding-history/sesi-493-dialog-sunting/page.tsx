// app/dashboard/superadmin/settings/register-vendor/page.tsx
// Halaman konfigurasi Pendaftaran Vendor — SuperAdmin Dashboard. Area C butir C-02.
//
// DUA PANEL, sengaja dipisah (K-483-4):
//   1. KOLOM  — apa yang diisi vendor di formulir  → tabel form_field_registry
//   2. ATURAN — perilaku sistem (tenggat, SLA, retensi) → config_registry feature_key='register_vendor'
//   Mencampur keduanya adalah sumber kekakuan yang K-483-4 batalkan: aturan pemerintah berubah,
//   SA menggeser saklar di panel 1 atau mengubah nilai di panel 2 — nol coding, nol deploy.
//
// Dibuat: Sesi #483. Alamat halaman ini TIDAK dipilih bebas: `resolveMenuHref` menurunkannya dari
//   `dashboard_menus.feature_flag = 'register_vendor'` dengan `_` → `-`, jadi foldernya WAJIB
//   `register-vendor`. Sebelum berkas ini ada, alamat itu dilayani catch-all `settings/[...slug]`.
//
// Pola panel ATURAN identik dengan settings/sistem: getConfigPageItems → ConfigPageClient generik.

export const dynamic = 'force-dynamic'

import { getConfigPageItems }  from '@/lib/config-registry'
import { ConfigPageClient }    from '../security-login/ConfigPageClient'
import { mapTipe, mapValue }   from '@/lib/utils/config-page.utils'
import type { ConfigItemData } from '@/components/ConfigItem'
import { getFormFieldsUntukAdmin } from '@/lib/services/form-field-registry.service'
import { FormFieldRegistryClient } from '@/components/superadmin/FormFieldRegistryClient'

const FORM_KEY    = 'register_vendor'
const FEATURE_KEY = 'register_vendor'

export default async function RegisterVendorSettingsPage() {
  // Kedua panel dibaca berbarengan — keduanya tidak saling bergantung.
  const [fieldGroups, configRows] = await Promise.all([
    getFormFieldsUntukAdmin(FORM_KEY),
    getConfigPageItems(FEATURE_KEY),
  ])

  // ── Panel ATURAN: kelompokkan per kategori → ConfigGroup[] ──────────────────
  const groupMap = new Map<string, { title: string; feature_key: string; items: ConfigItemData[] }>()

  for (const row of configRows) {
    const kat        = row.kategori   ?? 'Aturan'
    const policyKey  = row.policy_key ?? row.feature_key
    const featureKey = row.feature_key

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: featureKey, items: [] })
    }

    const item: ConfigItemData = {
      id:              row.id,
      label:           row.label,
      fieldName:       policyKey,
      type:            mapTipe(row.tipe_data, policyKey),
      value:           mapValue(row.nilai, row.tipe_data),
      options:         row.nilai_enum ?? undefined,
      valueType:       undefined,
      perRoleOptions:  undefined,
      option_group_id: null,
      // Pendaftaran vendor = kebijakan platform, bukan per-tenant ⇒ toggle override AT
      // tidak relevan ditampilkan (pola sama dengan settings/sistem).
      adminCanChange:  false,
      hideTenantOverrideToggle: true,
      enabled:         row.is_active,
    }

    groupMap.get(kat)!.items.push(item)
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-8 pt-4">
        <FormFieldRegistryClient formKey={FORM_KEY} initialData={fieldGroups} />
      </div>
      <ConfigPageClient initialData={Array.from(groupMap.values())} />
    </div>
  )
}
