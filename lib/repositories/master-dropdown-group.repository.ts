// lib/repositories/master-dropdown-group.repository.ts
// Repository untuk entitas master_dropdown_groups — akses DB langsung + via SP.
// Dipakai oleh: master-dropdown.service.ts.
//
// Pemecahan repository M4 (S#114): file ini fokus ke entitas GROUP saja.
// Operasi terhadap entitas OPTION → master-dropdown-option.repository.ts.
// Pemecahan by entitas dilakukan SEJAK AWAL agar growth-friendly (ATURAN 9 + ATURAN 31).
//
// 6 fungsi:
//   - findAllGroups, findGroupById, findAllGroupsWithOptions   (read)
//   - insertGroup, updateGroup                                 (mutation)
//   - deactivateGroup                                          (via SP — atomic + guard is_system)
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
  DropdownCategory,
} from '@/lib/types/master-dropdown.types'

// ─── Filter Types (lokal) ───────────────────────────────────────────────────

interface FilterGrup {
  category?: DropdownCategory
  isActive?: boolean
}

// ─── Read ───────────────────────────────────────────────────────────────────

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

  if (error) throw new Error(`[master-dropdown-group.repository] findAllGroups: ${error.message}`)
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

  if (error) throw new Error(`[master-dropdown-group.repository] findGroupById: ${error.message}`)
  return data as MasterDropdownGroup | null
}

/**
 * Ambil semua grup beserta opsinya — relational query untuk RSC list view.
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

  if (error) throw new Error(`[master-dropdown-group.repository] findAllGroupsWithOptions: ${error.message}`)
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

// ─── Mutation ───────────────────────────────────────────────────────────────

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

  if (error) throw new Error(`[master-dropdown-group.repository] insertGroup: ${error.message}`)
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

  if (error) throw new Error(`[master-dropdown-group.repository] updateGroup: ${error.message}`)
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

  if (error) throw new Error(`[master-dropdown-group.repository] deactivateGroup: ${error.message}`)
  return data as { berhasil: boolean; group_id: string; opsi_dinonaktifkan: number }
}

/**
 * HARD DELETE grup beserta semua opsinya — via DELETE FROM (cascade ke options via FK).
 * Dipakai saat verdict cache = AMAN (tidak ada dependency, item benar-benar tidak terpakai).
 * Guard is_system tetap di-enforce — grup sistem tidak boleh di-destroy walau AMAN.
 *
 * S#124: ditambah untuk Tombol Hapus tabel cache flow.
 */
export async function dropdownRepo_destroyGroup(
  groupId: string
): Promise<{ berhasil: boolean; group_id: string; opsi_dihapus: number }> {
  const db = createServerSupabaseClient()

  // Guard is_system
  const grup = await dropdownRepo_findGroupById(groupId)
  if (!grup) throw new Error('Grup tidak ditemukan')
  if (grup.is_system) throw new Error('Grup sistem tidak dapat dihapus')

  // Hitung opsi non-soft-deleted (untuk return info)
  const { data: opsiRows, error: countError } = await db
    .from('master_dropdown_options')
    .select('id', { count: 'exact' })
    .eq('group_id', groupId)
    .is('deleted_at', null)
  if (countError) throw new Error(`[master-dropdown-group.repository] destroyGroup count: ${countError.message}`)
  const opsiDihapus = opsiRows?.length ?? 0

  // HARD DELETE — FK ON DELETE CASCADE akan auto-hapus master_dropdown_options
  const { error } = await db
    .from('master_dropdown_groups')
    .delete()
    .eq('id', groupId)

  if (error) throw new Error(`[master-dropdown-group.repository] destroyGroup: ${error.message}`)
  return { berhasil: true, group_id: groupId, opsi_dihapus: opsiDihapus }
}
