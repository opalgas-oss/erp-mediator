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
// PERUBAHAN Sesi #163 — Fix T-028 (DRY) + T-027 (text-field):
//   - Hapus definisi lokal mapTipe, mapValue, JsonFieldConfig, ConfigItemType, isTimingField
//   - Import semua dari @/lib/utils/config-page.utils (satu sumber kebenaran)
//   - mapTipe sekarang handle tipe_data='text' → 'text-field' (fix vendor_blocked_statuses)
// PERUBAHAN Sesi #209 — Tambah otp_only ke options require_otp + require_otp_superadmin (per TDD-Q1)
// PERUBAHAN Sesi #177 — Fix PV-09 (Repository Pattern):
//   - Hapus direct db.from('config_registry') di RSC page
//   - Ganti dengan getConfigPageItems('security_login') dari lib/config-registry
//   - Hapus import createServerSupabaseClient (tidak dipakai lagi)
// PERUBAHAN Sesi #285 — B-03 mapping AT toggle:
//   - Tambah HIDE_AT_TOGGLE: set 8 policy_key yang toggle AT-nya WAJIB dihapus dari UI
//   - Alasan: item keamanan platform — AT tidak boleh kontrol sama sekali
//   - Referensi: SA_Testing_dan_Hutang.md B-03, CONFIG_REGISTRY_CORE_v1.md BAB 1

export const dynamic = 'force-dynamic'

import { getConfigPageItems }                      from '@/lib/config-registry'
import { ConfigPageClient }                        from './ConfigPageClient'
import { mapTipe, mapValue, type JsonFieldConfig } from '@/lib/utils/config-page.utils'
import type { ConfigItemData }                     from '@/components/ConfigItem'

// ─── Policy key yang TIDAK BOLEH ditampilkan toggle AT sama sekali ─────────────
// Dasar keputusan: item keamanan platform — AT tidak punya otoritas mengontrol ini
// Sumber: CONFIG_REGISTRY_CORE_v1.md BAB 1 (kolom Tenant Admin = ❌)
const HIDE_AT_TOGGLE = new Set([
  'notify_superadmin_on_lock',   // AT tidak boleh kontrol notif ke atasnya
  'progressive_lockout_enabled', // mekanisme keamanan platform, SA-only
  'vendor_blocked_statuses',     // kriteria blokir login Vendor = keamanan platform
  'gps_mode',                    // GPS on/off = keamanan platform
  'otp_expiry_seconds',          // validity OTP = keamanan platform
  'max_otp_attempts',            // anti-brute-force = keamanan platform
  'otp_digits',                  // standar keamanan platform
  'max_otp_resend',              // anti-spam OTP = keamanan platform
])

// ─── Konfigurasi tipe per field JSON per-role ─────────────────────────────────

const JSON_FIELD_CONFIG: Record<string, JsonFieldConfig> = {
  require_otp:                      { valueType: 'select', options: ['disabled', 'required', 'otp_only', 'both'], allowedRoles: ['customer', 'vendor', 'admin_tenant'] },
  require_otp_superadmin:           { valueType: 'select', options: ['disabled', 'required', 'otp_only', 'both'], allowedRoles: ['super_admin'] },
  biometric_mode:                   { valueType: 'select', options: ['required', 'disabled'], allowedRoles: ['customer', 'vendor', 'admin_tenant'] },
  biometric_mode_superadmin:        { valueType: 'select', options: ['required', 'disabled'], allowedRoles: ['super_admin'] },
  max_concurrent_sessions_per_role: { valueType: 'number' },
  notify_multi_device_login:        { valueType: 'boolean' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LoginSettingsPage() {
  // getConfigPageItems: full row data, tidak filter is_active (SA lihat semua — pola S#110)
  const rows = await getConfigPageItems('security_login')

  // Kelompokkan per kategori → format ConfigGroup[]
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  for (const row of rows) {
    const kat        = row.kategori    ?? 'Security Login'
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
      valueType:                jsonCfg?.valueType,
      perRoleOptions:              jsonCfg?.options,
      allowedRoles:                jsonCfg?.allowedRoles,
      hideTenantOverrideToggle:    HIDE_AT_TOGGLE.has(policyKey) || (jsonCfg?.allowedRoles?.length === 1 && jsonCfg.allowedRoles[0] === 'super_admin'),
      option_group_id: null,
      adminCanChange:  row.tenant_can_override ?? false,
      enabled:         row.is_active ?? true,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
