// ARSIP pra-edit — sesi-284-fix-option-hard-delete
// Original: lib/services/master-dropdown-option.service.ts
// Belum ada MasterDropdownService_destroyOption

import 'server-only'
import {
  dropdownRepo_insertOption,
  dropdownRepo_updateOption,
  dropdownRepo_setDefaultOption,
} from '@/lib/repositories/master-dropdown-option.repository'
import { dropdownRepo_findGroupById } from '@/lib/repositories/master-dropdown-group.repository'
import { validateDropdownSlug, validateSortOrder } from '@/lib/utils/validation.server'
import type {
  MasterDropdownOption,
  BuatOpsiPayload,
  UbahOpsiPayload,
} from '@/lib/types/master-dropdown.types'

function validateLabel(label: string): void {
  if (!label || label.trim().length === 0) throw new Error('Label opsi tidak boleh kosong')
  if (label.length > 200) throw new Error('Label opsi maksimal 200 karakter')
}

function validateValueExists(payload: {
  numeric_value: number | null
  string_value:  string | null
  json_value:    Record<string, unknown> | null
}): void {
  const ada = payload.numeric_value !== null || payload.string_value !== null || payload.json_value !== null
  if (!ada) throw new Error('Minimal salah satu dari numeric_value / string_value / json_value harus terisi')
}

export async function MasterDropdownService_createOption(payload: BuatOpsiPayload, olehUid: string): Promise<MasterDropdownOption> {
  validateDropdownSlug(payload.slug)
  validateLabel(payload.label)
  validateSortOrder(payload.sort_order)
  validateValueExists(payload)
  const grup = await dropdownRepo_findGroupById(payload.group_id)
  if (!grup) throw new Error('Grup dropdown tidak ditemukan')
  if (!grup.is_active) throw new Error('Grup dropdown tidak aktif')
  if (payload.tenant_id !== null) {
    if (!grup.tenant_can_override) throw new Error('Grup ini tidak mengizinkan tenant override')
    if (grup.tenant_override_mode === 'none') throw new Error('Grup ini override-mode-nya none')
  }
  return dropdownRepo_insertOption(payload, olehUid)
}

export async function MasterDropdownService_updateOption(id: string, payload: UbahOpsiPayload, olehUid: string): Promise<MasterDropdownOption> {
  if (payload.label      !== undefined) validateLabel(payload.label)
  if (payload.sort_order !== undefined) validateSortOrder(payload.sort_order)
  return dropdownRepo_updateOption(id, payload, olehUid)
}

export async function MasterDropdownService_setDefaultOption(groupId: string, optionId: string, olehUid: string): Promise<{ berhasil: boolean; option_id: string }> {
  return dropdownRepo_setDefaultOption(groupId, optionId, olehUid)
}
