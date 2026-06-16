// ARSIP — page.tsx sebelum sesi-285-hide-at-toggle-security-login
// Sumber: app/dashboard/superadmin/settings/security-login/page.tsx

export const dynamic = 'force-dynamic'

import { getConfigPageItems }                      from '@/lib/config-registry'
import { ConfigPageClient }                        from './ConfigPageClient'
import { mapTipe, mapValue, type JsonFieldConfig } from '@/lib/utils/config-page.utils'
import type { ConfigItemData }                     from '@/components/ConfigItem'

const JSON_FIELD_CONFIG: Record<string, JsonFieldConfig> = {
  require_otp:                      { valueType: 'select', options: ['disabled', 'required', 'otp_only', 'both'], allowedRoles: ['customer', 'vendor', 'admin_tenant'] },
  require_otp_superadmin:           { valueType: 'select', options: ['disabled', 'required', 'otp_only', 'both'], allowedRoles: ['super_admin'] },
  biometric_mode:                   { valueType: 'select', options: ['required', 'disabled'], allowedRoles: ['customer', 'vendor', 'admin_tenant'] },
  biometric_mode_superadmin:        { valueType: 'select', options: ['required', 'disabled'], allowedRoles: ['super_admin'] },
  max_concurrent_sessions_per_role: { valueType: 'number' },
  notify_multi_device_login:        { valueType: 'boolean' },
}

export default async function LoginSettingsPage() {
  const rows = await getConfigPageItems('security_login')

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
      hideTenantOverrideToggle:    jsonCfg?.allowedRoles?.length === 1 && jsonCfg.allowedRoles[0] === 'super_admin',
      option_group_id: null,
      adminCanChange:  row.tenant_can_override ?? false,
      enabled:         row.is_active ?? true,
    }

    groupMap.get(kat)!.items.push(item)
  }

  const initialData = Array.from(groupMap.values())
  return <ConfigPageClient initialData={initialData} />
}
