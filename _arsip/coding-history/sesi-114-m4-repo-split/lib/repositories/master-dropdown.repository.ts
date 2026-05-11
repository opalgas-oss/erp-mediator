// lib/repositories/master-dropdown.repository.ts
// Repository untuk M4 Master Dropdown — akses DB langsung + via SP.
// Dipakai oleh: master-dropdown.service.ts.
//
// Pembagian 10 fungsi:
//   GROUP (5)    : findAllGroups, findGroupById, insertGroup, updateGroup, deactivateGroup
//   OPTION (4)   : findOptionsByGroupId, insertOption, updateOption, setDefaultOption
//   COMBINED (1) : findAllGroupsWithOptions (relational query untuk RSC list)
//
// Logika bisnis TIDAK di sini — di Service layer. Repository hanya akses data.
//
// Dibuat: Sesi #114 — M4 Master Dropdown FASE 3 Step 3.3

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  MasterDropdownGroup,
  MasterDropdownOption,
  GrupDenganOpsi,
  BuatGrupPayload,
  UbahGrupPayload,
  BuatOpsiPayload,
  UbahOpsiPayload,
  DropdownCategory,
} from '@/lib/types/master-dropdown.types'

// ─── Filter Types (lokal) ───────────────────────────────────────────────────

interface FilterGrup {
  category?: DropdownCategory
  isActive?: boolean
}

// ─── GROUP — Read ───────────────────────────────────────────────────────────

/**
 * Ambil semua grup dropdown (tanpa opsi). Filter opsional by category + is_active.
 * Default order: sort_order ASC, display_name ASC.
 */
export async function dropdownRepo_findAllGroups(
  filter?: FilterGrup
): Promise<MasterDropdownGroup[]> {
  const db = createServerSupabaseClient()

  let query = db
    .from('master_dropdown_groups')
    .select('*')
    .is('deleted_at', null)

  if (filter?.category)               query = query.eq('category',  filter.category)
  if (filter?.isActive !== undefined) query = query.eq('is_active', filter.isActive)

  const { data, error } = await query
    .order('sort_order',   { ascending: true })
    .order('display_name', { ascending: true })

  if (error) throw new Error(`[master-dropdown.repository] findAllGroups: ${error.message}`)
  return (data ?? []) as MasterDropdownGroup[]
}

/**
 * Detail grup by id. Return null jika tidak ditemukan / soft-deleted.
 */
export async function dropdownRepo_findGroupById(
  id: string
): Promise<MasterDropdownGroup | null> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('master_dropdown_groups')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error(`[master-dropdown.repository] findGroupById: ${error.message}`)
  return data as MasterDropdownGroup | null
}

// ─── GROUP — Mutation ───────────────────────────────────────────────────────

/**
 * Insert grup dropdown baru.
 */
export async function dropdownRepo_insertGroup(
  payload: BuatGrupPayload,
  olehUid: string
): Promise<MasterDropdownGroup> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('master_dropdown_groups')
    .insert({
      slug:                 payload.slug,
      display_name:         payload.display_name,
      description:          payload.description,
      category:             payload.category,
      module:               payload.module,
      tenant_can_override:  payload.tenant_can_override,
      tenant_override_mode: payload.tenant_override_mode,
      is_system:            payload.is_system,
      sort_order:           payload.sort_order,
      created_by:           olehUid,
      updated_by:           olehUid,
    })
    .select()
    .single()

  if (error) throw new Error(`[master-dropdown.repository] insertGroup: ${error.message}`)
  return data as MasterDropdownGroup
}

/**
 * Partial update grup. Hanya field yang diisi di payload yang diupdate.
 */
export async function dropdownRepo_updateGroup(
  id: string,
  payload: UbahGrupPayload,
  olehUid: string
): Promise<MasterDropdownGroup> {
  const db = createServerSupabaseClient()

  const updateData: Record<string, unknown> = { updated_by: olehUid }
  if (payload.display_name         !== undefined) updateData.display_name         = payload.display_name
  if (payload.description          !== undefined) updateData.description          = payload.description
  if (payload.category             !== undefined) updateData.category             = payload.category
  if (payload.module               !== undefined) updateData.module               = payload.module
  if (payload.tenant_can_override  !== undefined) updateData.tenant_can_override  = payload.tenant_can_override
  if (payload.tenant_override_mode !== undefined) updateData.tenant_override_mode = payload.tenant_override_mode
  if (payload.sort_order           !== undefined) updateData.sort_order           = payload.sort_order

  const { data, error } = await db
    .from('master_dropdown_groups')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`[master-dropdown.repository] updateGroup: ${error.message}`)
  return data as MasterDropdownGroup
}

/**
 * Nonaktifkan grup + cascade nonaktifkan semua opsinya — via stored procedure.
 * SP `sp_dropdown_deactivate_group` atomic dengan guard is_system (lihat Functions_StoredProcedures.md).
 */
export async function dropdownRepo_deactivateGroup(
  groupId: string,
  olehUid: string
): Promise<{ berhasil: boolean; group_id: string; opsi_dinonaktifkan: number }> {
  const db = createServerSupabaseClient()

  const { data, error } = await db.rpc('sp_dropdown_deactivate_group', {
    p_group_id: groupId,
    p_oleh_uid: olehUid,
  })

  if (error) throw new Error(`[master-dropdown.repository] deactivateGroup: ${error.message}`)
  return data as { berhasil: boolean; group_id: string; opsi_dinonaktifkan: number }
}

// ─── OPTION — Read ──────────────────────────────────────────────────────────

/**
 * Ambil semua opsi untuk satu grup (platform + tenant override). Tidak filter tenant.
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

  if (error) throw new Error(`[master-dropdown.repository] findOptionsByGroupId: ${error.message}`)
  return (data ?? []) as MasterDropdownOption[]
}

// ─── OPTION — Mutation ──────────────────────────────────────────────────────

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

  if (error) throw new Error(`[master-dropdown.repository] insertOption: ${error.message}`)
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

  if (error) throw new Error(`[master-dropdown.repository] updateOption: ${error.message}`)
  return data as MasterDropdownOption
}

/**
 * Set satu opsi sebagai default di grup, unset opsi default lain — via stored procedure.
 * SP `sp_dropdown_set_default_option` atomic dengan validasi opsi platform-level.
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

  if (error) throw new Error(`[master-dropdown.repository] setDefaultOption: ${error.message}`)
  return data as { berhasil: boolean; option_id: string }
}

// ─── COMBINED — Read (untuk RSC list view) ──────────────────────────────────

/**
 * Ambil semua grup beserta opsinya dalam satu query relational — efisien untuk RSC.
 * Filter opsional by category + is_active grup.
 * Soft-deleted opsi di-filter di sini, sort di-apply ke level grup + opsi.
 */
export async function dropdownRepo_findAllGroupsWithOptions(
  filter?: FilterGrup
): Promise<GrupDenganOpsi[]> {
  const db = createServerSupabaseClient()

  let query = db
    .from('master_dropdown_groups')
    .select('*, master_dropdown_options(*)')
    .is('deleted_at', null)

  if (filter?.category)               query = query.eq('category',  filter.category)
  if (filter?.isActive !== undefined) query = query.eq('is_active', filter.isActive)

  const { data, error } = await query
    .order('sort_order',   { ascending: true })
    .order('display_name', { ascending: true })

  if (error) throw new Error(`[master-dropdown.repository] findAllGroupsWithOptions: ${error.message}`)
  if (!data) return []

  return data.map((grup) => {
    const { master_dropdown_options: opsiRaw, ...grupTanpaRelasi } = grup as MasterDropdownGroup & {
      master_dropdown_options: MasterDropdownOption[] | null
    }

    const opsi = (opsiRaw ?? [])
      .filter((o) => o.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))

    return { ...grupTanpaRelasi, opsi } as GrupDenganOpsi
  })
}
