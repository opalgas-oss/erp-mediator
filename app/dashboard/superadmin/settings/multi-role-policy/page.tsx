// app/dashboard/superadmin/settings/multi-role-policy/page.tsx
// Halaman konfigurasi Multi-Role Policy — SuperAdmin Dashboard.
// Membaca 15 config items dari config_registry (feature_key='multi_role_policy').
// Semua items platform-only (tenant_id IS NULL) — hanya SuperAdmin yang bisa ubah.
// Mendukung tipe: toggle (boolean), number-unit (number), json-per-role (json).
//
// Dibuat: Sesi #097 — PL-S08 M1 Config & Policy Management

export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ConfigPageClient }           from '../security-login/ConfigPageClient'
import type { ConfigItemData }        from '@/components/ConfigItem'

// ─── Konfigurasi tipe per field JSON per-role ─────────────────────────────────

type JsonFieldConfig = {
  valueType: 'boolean' | 'number' | 'select'
  options?:  string[]
}

const JSON_FIELD_CONFIG: Record<string, JsonFieldConfig> = {
  max_concurrent_sessions_per_role: { valueType: 'number' },
  notify_multi_device_login:        { valueType: 'boolean' },
}

// ─── Helper: map tipe_data DB → type ConfigItem ───────────────────────────────

type ConfigItemType = ConfigItemData['type']

function mapTipe(tipeData: string): ConfigItemType {
  if (tipeData === 'boolean') return 'toggle'
  if (tipeData === 'json')    return 'json-per-role'
  return 'number-unit'  // number biasa (bukan timing — tidak ada suffix waktu di group ini)
}

// ─── Helper: map nilai DB (string) → tipe sesuai tipe_data ──────────────────

function mapValue(nilai: string, tipeData: string): number | boolean | string {
  if (tipeData === 'boolean') return nilai === 'true'
  if (tipeData === 'number')  return Number(nilai)
  return nilai // json: tetap string untuk PerRoleJsonEditor
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MultiRolePolicyPage() {
  const db = createServerSupabaseClient()

  const { data } = await db
    .from('config_registry')
    .select('*')
    .eq('feature_key', 'multi_role_policy')
    .is('tenant_id', null)
    .eq('is_active', true)
    .order('label', { ascending: true })

  // Kelompokkan per kategori → format ConfigGroup[]
  // Semua items multi_role_policy masuk satu grup 'Multi-Role Policy'
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of data ?? []) {
    const kat        = (row.kategori    as string | null) ?? 'Multi-Role Policy'
    const policyKey  = (row.policy_key  as string | null) ?? (row.feature_key as string)
    const tipeData   = row.tipe_data    as string
    const featureKey = row.feature_key  as string

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: featureKey, items: [] })
    }

    const jsonCfg = JSON_FIELD_CONFIG[policyKey]

    const item: ConfigItemData = {
      id:              row.id       as string,
      label:           row.label    as string,
      fieldName:       policyKey,
      type:            mapTipe(tipeData),
      value:           mapValue(row.nilai as string, tipeData),
      options:         (row.nilai_enum as string[] | null) ?? undefined,
      valueType:       jsonCfg?.valueType,
      perRoleOptions:  jsonCfg?.options,
      option_group_id: null,
      adminCanChange:  false, // multi_role_policy = platform-only, tidak bisa di-override tenant
      enabled:         row.is_active as boolean,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())

  return <ConfigPageClient initialData={initialData} />
}
