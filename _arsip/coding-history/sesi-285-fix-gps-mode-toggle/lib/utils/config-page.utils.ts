// ARSIP — config-page.utils.ts sebelum sesi-285-fix-gps-mode-toggle
// Sumber: lib/utils/config-page.utils.ts

import type { ConfigItemData } from '@/components/ConfigItem'

export type JsonFieldConfig = {
  valueType:    'boolean' | 'number' | 'select'
  options?:     string[]
  allowedRoles?: ReadonlyArray<'customer' | 'vendor' | 'admin_tenant' | 'super_admin'>
}

export type ConfigItemType = ConfigItemData['type']

const TIMING_SUFFIXES = ['_seconds', '_minutes', '_hours', '_days'] as const

export function isTimingField(policyKey: string): boolean {
  return TIMING_SUFFIXES.some((s) => policyKey.endsWith(s))
}

export function mapTipe(tipeData: string, policyKey?: string): ConfigItemType {
  if (tipeData === 'boolean')                                         return 'toggle'
  if (tipeData === 'select')                                          return 'select-only'
  if (tipeData === 'json')                                            return 'json-per-role'
  if (tipeData === 'text')                                            return 'text-field'
  if (tipeData === 'string')                                          return 'text-field'
  if (tipeData === 'number' && policyKey && isTimingField(policyKey)) return 'timing'
  return 'number-unit'
}

export function mapValue(nilai: string, tipeData: string): number | boolean | string {
  if (tipeData === 'boolean') return nilai === 'true'
  if (tipeData === 'number')  return Number(nilai)
  return nilai
}
