// ARSIP — page.tsx sebelum sesi-285-hide-at-toggle-multi-role-platform-general
// Sumber: app/dashboard/superadmin/settings/multi-role-policy/page.tsx

export const dynamic = 'force-dynamic'

import { getConfigPageItems }                      from '@/lib/config-registry'
import { ConfigPageClient }                        from '../security-login/ConfigPageClient'
import { mapTipe, mapValue, type JsonFieldConfig } from '@/lib/utils/config-page.utils'
import type { ConfigItemData }                     from '@/components/ConfigItem'

const JSON_FIELD_CONFIG: Record<string, JsonFieldConfig> = {
  max_concurrent_sessions_per_role: { valueType: 'number' },
  notify_multi_device_login:        { valueType: 'boolean' },
}

export default async function MultiRolePolicyPage() {
  const rows = await getConfigPageItems('multi_role_policy')
  const groupMap = new Map<string, { title: string; feature_key: string; items: ConfigItemData[] }>()

  for (const row of rows) {
    const kat        = row.kategori    ?? 'Multi-Role Policy'
    const policyKey  = row.policy_key  ?? row.feature_key
    const tipeData   = row.tipe_data
    const featureKey = row.feature_key
    if (!groupMap.has(kat)) groupMap.set(kat, { title: kat, feature_key: featureKey, items: [] })
    const jsonCfg = JSON_FIELD_CONFIG[policyKey]
    const item: ConfigItemData = {
      id: row.id, label: row.label, fieldName: policyKey,
      type: mapTipe(tipeData, policyKey), value: mapValue(row.nilai, tipeData),
      options: row.nilai_enum ?? undefined, valueType: jsonCfg?.valueType,
      perRoleOptions: jsonCfg?.options, option_group_id: null,
      adminCanChange: false, enabled: row.is_active,
    }
    groupMap.get(kat)!.items.push(item)
  }
  return <ConfigPageClient initialData={Array.from(groupMap.values())} />
}
