// lib/repositories/master-dropdown-option.repository.ts
// Repository untuk entitas master_dropdown_options — akses DB langsung + via SP.
// Dipakai oleh: master-dropdown.service.ts.
//
// Pemecahan repository M4 (S#114): file ini fokus ke entitas OPTION saja.
// Operasi terhadap entitas GROUP → master-dropdown-group.repository.ts.
// Pemecahan by entitas dilakukan SEJAK AWAL agar growth-friendly (ATURAN 9 + ATURAN 31).
//
// 4 fungsi:
//   - findOptionsByGroupId                       (read)
//   - insertOption, updateOption                 (mutation)
//   - setDefaultOption                           (via SP — atomic + validasi platform-level)
//
// Dibuat: Sesi #114 — M4 Master Dropdown FASE 3 Step 3.3

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  MasterDropdownOption,
  BuatOpsiPayload,
  UbahOpsiPayload,
} from '@/lib/types/master-dropdown.types'

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * Ambil semua opsi untuk satu grup (platform + semua tenant override). Tidak filter tenant.
 * Default order: sort_order ASC, label ASC.
 */
export async function dropdownRepo_findOptionsByGroupId(
  groupId: string
): Promise<MasterDropdownOption[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('master_dropdown_options')
    .select('*')
    .eq('group_id', groupId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('label',      { ascending: true })

  if (error) throw new Error(`[master-dropdown-option.repository] findOptionsByGroupId: ${error.message}`)
  return (data ?? []) as MasterDropdownOption[]
}

// ─── Mutation ───────────────────────────────────────────────────────────────

/**
 * Insert opsi baru ke grup.
 */
export async function dropdownRepo_insertOption(
  payload: BuatOpsiPayload,
  olehUid: string
): Promise<MasterDropdownOption> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('master_dropdown_options')
    .insert({
      group_id:      payload.group_id,
      slug:          payload.slug,
      label:         payload.label,
      numeric_value: payload.numeric_value,
      string_value:  payload.string_value,
      json_value:    payload.json_value,
      is_default:    payload.is_default,
      is_system:     payload.is_system,
      tenant_id:     payload.tenant_id,
      sort_order:    payload.sort_order,
      created_by:    olehUid,
      updated_by:    olehUid,
    })
    .select()
    .single()

  if (error) throw new Error(`[master-dropdown-option.repository] insertOption: ${error.message}`)
  return data as MasterDropdownOption
}

/**
 * Partial update opsi. Hanya field yang diisi di payload yang diupdate.
 */
export async function dropdownRepo_updateOption(
  id: string,
  payload: UbahOpsiPayload,
  olehUid: string
): Promise<MasterDropdownOption> {
  const db = createServerSupabaseClient()

  const updateData: Record<string, unknown> = { updated_by: olehUid }
  if (payload.label         !== undefined) updateData.label         = payload.label
  if (payload.numeric_value !== undefined) updateData.numeric_value = payload.numeric_value
  if (payload.string_value  !== undefined) updateData.string_value  = payload.string_value
  if (payload.json_value    !== undefined) updateData.json_value    = payload.json_value
  if (payload.sort_order    !== undefined) updateData.sort_order    = payload.sort_order
  if (payload.is_active     !== undefined) updateData.is_active     = payload.is_active

  const { data, error } = await db
    .from('master_dropdown_options')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`[master-dropdown-option.repository] updateOption: ${error.message}`)
  return data as MasterDropdownOption
}

/**
 * Set satu opsi sebagai default di grup, unset opsi default lain — via stored procedure.
 * SP `sp_dropdown_set_default_option` atomic dengan validasi opsi platform-level (tenant_id IS NULL).
 */
export async function dropdownRepo_setDefaultOption(
  groupId: string,
  optionId: string,
  olehUid: string
): Promise<{ berhasil: boolean; option_id: string }> {
  const db = createServerSupabaseClient()

  const { data, error } = await db.rpc('sp_dropdown_set_default_option', {
    p_group_id:  groupId,
    p_option_id: optionId,
    p_oleh_uid:  olehUid,
  })

  if (error) throw new Error(`[master-dropdown-option.repository] setDefaultOption: ${error.message}`)
  return data as { berhasil: boolean; option_id: string }
}
