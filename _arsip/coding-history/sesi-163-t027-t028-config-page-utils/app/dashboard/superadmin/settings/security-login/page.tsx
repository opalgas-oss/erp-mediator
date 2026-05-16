// app/dashboard/superadmin/settings/security-login/page.tsx
// Halaman konfigurasi Security Login — SuperAdmin Dashboard.
//
// PERUBAHAN Sesi #097 — PL-S08 M1: mapTipe + JSON_FIELD_CONFIG + groupMap feature_key fix
// PERUBAHAN Sesi #109 — Refactor tenant_can_override: adminCanChange map ke tenant_can_override
// PERUBAHAN Sesi #110 — Fix is_active query:
//   - HAPUS .eq('is_active', true) dari query SuperAdmin Dashboard
//   - SuperAdmin WAJIB bisa lihat SEMUA item (aktif maupun tidak aktif)
//   - Filter is_active hanya dipakai saat sistem MENGEKSEKUSI feature, BUKAN di UI management
//   - Tanpa fix ini: SuperAdmin tidak bisa menyalakan kembali item yang is_active=false

export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ConfigPageClient }           from './ConfigPageClient'
import type { ConfigItemData }        from '@/components/ConfigItem'

// ─── Konfigurasi tipe per field JSON per-role ─────────────────────────────────

type JsonFieldConfig = {
  valueType: 'boolean' | 'number' | 'select'
  options?:  string[]
}

const JSON_FIELD_CONFIG: Record<string, JsonFieldConfig> = {
  require_otp:                      { valueType: 'select', options: ['required', 'optional', 'disabled'] },
  biometric_mode:                   { valueType: 'select', options: ['optional', 'disabled'] },
  max_concurrent_sessions_per_role: { valueType: 'number' },
  notify_multi_device_login:        { valueType: 'boolean' },
}

// ─── Helper: deteksi field timing dari suffix nama kolom ─────────────────────

const TIMING_SUFFIXES = ['_seconds', '_minutes', '_hours', '_days'] as const

function isTimingField(policyKey: string): boolean {
  return TIMING_SUFFIXES.some((s) => policyKey.endsWith(s))
}

// ─── Helper: map tipe_data DB → type ConfigItem ───────────────────────────────

type ConfigItemType = ConfigItemData['type']

function mapTipe(tipeData: string, policyKey: string): ConfigItemType {
  if (tipeData === 'boolean')                             return 'toggle'
  if (tipeData === 'select')                              return 'select-only'
  if (tipeData === 'json')                                return 'json-per-role'
  if (tipeData === 'number' && isTimingField(policyKey))  return 'timing'
  return 'number-unit'
}

// ─── Helper: map nilai DB (string) → tipe sesuai tipe_data ──────────────────

function mapValue(nilai: string, tipeData: string): number | boolean | string {
  if (tipeData === 'boolean') return nilai === 'true'
  if (tipeData === 'number')  return Number(nilai)
  return nilai
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LoginSettingsPage() {
  const db = createServerSupabaseClient()

  const { data } = await db
    .from('config_registry')
    .select('*')
    .eq('feature_key', 'security_login')
    .is('tenant_id', null)
    .order('label', { ascending: true })

  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of data ?? []) {
    const kat        = row.kategori    as string
    const policyKey  = (row.policy_key as string | null) ?? (row.feature_key as string)
    const tipeData   = row.tipe_data   as string
    const featureKey = row.feature_key as string

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: featureKey, items: [] })
    }

    const jsonCfg = JSON_FIELD_CONFIG[policyKey]

    const item: ConfigItemData = {
      id:              row.id       as string,
      label:           row.label    as string,
      fieldName:       policyKey,
      type:            mapTipe(tipeData, policyKey),
      value:           mapValue(row.nilai as string, tipeData),
      options:         (row.nilai_enum as string[] | null) ?? undefined,
      valueType:       jsonCfg?.valueType,
      perRoleOptions:  jsonCfg?.options,
      option_group_id: null,
      adminCanChange:  (row.tenant_can_override as boolean) ?? false,
      enabled:         (row.is_active as boolean) ?? true,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())

  return <ConfigPageClient initialData={initialData} />
}
