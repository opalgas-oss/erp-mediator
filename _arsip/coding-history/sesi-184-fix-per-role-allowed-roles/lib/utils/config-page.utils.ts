// lib/utils/config-page.utils.ts — ARSIP PRE-FIX sesi-184-fix-per-role-allowed-roles
// JsonFieldConfig belum punya allowedRoles

import type { ConfigItemData } from '@/components/ConfigItem'

export type JsonFieldConfig = {
  valueType: 'boolean' | 'number' | 'select'
  options?:  string[]
}
// [sisa file sama persis dengan versi aktif — dipotong untuk brevity arsip]
