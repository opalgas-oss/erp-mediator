// lib/services/master-dropdown-group.service.ts
// Service layer untuk entitas master_dropdown_groups — business logic + validation.
// Dipakai oleh: API route handlers di app/api/superadmin/dropdowns/groups/.
//
// ARSITEKTUR:
//   RSC / API Route → MasterDropdownService_* (file ini)
//                  → dropdownRepo_* (master-dropdown-group.repository.ts)
//                  → DB
//
// Pemecahan service M4 (S#114): file ini fokus ke entitas GROUP saja.
// Operasi terhadap entitas OPTION → master-dropdown-option.service.ts.
//
// 6 fungsi:
//   - listGroups, listGroupsWithOptions, getGroupDetail   (read)
//   - createGroup, updateGroup, deactivateGroup           (mutation)
//
// Dibuat: Sesi #114 — M4 Master Dropdown FASE 3 Step 3.4

import 'server-only'
import {
  dropdownRepo_findAllGroups,
  dropdownRepo_findAllGroupsWithOptions,
  dropdownRepo_findGroupById,
  dropdownRepo_insertGroup,
  dropdownRepo_updateGroup,
  dropdownRepo_deactivateGroup,
  dropdownRepo_destroyGroup,
} from '@/lib/repositories/master-dropdown-group.repository'
import { dropdownRepo_findOptionsByGroupId } from '@/lib/repositories/master-dropdown-option.repository'
import type {
  MasterDropdownGroup,
  GrupDenganOpsi,
  BuatGrupPayload,
  UbahGrupPayload,
  DropdownCategory,
} from '@/lib/types/master-dropdown.types'

// ─── Validation Helpers (lokal) ─────────────────────────────────────────────

const SLUG_REGEX = /^[a-z][a-z0-9_]*$/

function validateSlug(slug: string): void {
  if (!slug || slug.length < 2 || slug.length > 64) {
    throw new Error('Slug grup harus 2–64 karakter')
  }
  if (!SLUG_REGEX.test(slug)) {
    throw new Error('Slug grup hanya boleh huruf kecil, angka, dan underscore (mulai dari huruf)')
  }
}

function validateDisplayName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Nama tampilan grup tidak boleh kosong')
  }
  if (name.length > 200) {
    throw new Error('Nama tampilan grup maksimal 200 karakter')
  }
}

function validateSortOrder(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Sort order harus bilangan bulat non-negatif')
  }
}

// ─── Read ───────────────────────────────────────────────────────────────────

/**
 * List semua grup dropdown (tanpa opsi). Filter opsional by category + is_active.
 */
export async function MasterDropdownService_listGroups(
  filter?: { category?: DropdownCategory; isActive?: boolean }
): Promise<MasterDropdownGroup[]> {
  return dropdownRepo_findAllGroups(filter)
}

/**
 * List semua grup beserta opsinya — relational query untuk RSC list view.
 * Filter opsional by category + is_active grup.
 */
export async function MasterDropdownService_listGroupsWithOptions(
  filter?: { category?: DropdownCategory; isActive?: boolean }
): Promise<GrupDenganOpsi[]> {
  return dropdownRepo_findAllGroupsWithOptions(filter)
}

/**
 * Detail satu grup beserta opsinya. Panggil 2 query paralel (grup + opsi).
 * Return null jika grup tidak ditemukan.
 */
export async function MasterDropdownService_getGroupDetail(
  id: string
): Promise<GrupDenganOpsi | null> {
  const [grup, opsi] = await Promise.all([
    dropdownRepo_findGroupById(id),
    dropdownRepo_findOptionsByGroupId(id),
  ])

  if (!grup) return null
  return { ...grup, opsi }
}

// ─── Mutation ───────────────────────────────────────────────────────────────

/**
 * Buat grup dropdown baru. Validasi: slug, display_name, sort_order.
 * Catatan MVP: tenant_override_mode='full' diperbolehkan di schema tapi belum diimplementasi
 * di logic — gunakan 'none' atau 'add_only' untuk MVP (validasi runtime ditambah saat fitur full aktif).
 */
export async function MasterDropdownService_createGroup(
  payload: BuatGrupPayload,
  olehUid: string
): Promise<MasterDropdownGroup> {
  validateSlug(payload.slug)
  validateDisplayName(payload.display_name)
  validateSortOrder(payload.sort_order)

  return dropdownRepo_insertGroup(payload, olehUid)
}

/**
 * Update grup dropdown. Partial — hanya field yang diisi yang diupdate.
 * Guard: jika is_system=true, perubahan category dan slug ditolak (lock identitas grup sistem).
 * (slug tidak ada di UbahGrupPayload, tapi guard tetap tertulis sebagai dokumentasi intent.)
 */
export async function MasterDropdownService_updateGroup(
  id: string,
  payload: UbahGrupPayload,
  olehUid: string
): Promise<MasterDropdownGroup> {
  if (payload.display_name !== undefined) validateDisplayName(payload.display_name)
  if (payload.sort_order   !== undefined) validateSortOrder(payload.sort_order)

  // Guard is_system: cek grup eksisting
  const existing = await dropdownRepo_findGroupById(id)
  if (!existing) {
    throw new Error('Grup dropdown tidak ditemukan')
  }
  if (existing.is_system && payload.category !== undefined && payload.category !== existing.category) {
    throw new Error('Kategori grup sistem tidak dapat diubah')
  }

  return dropdownRepo_updateGroup(id, payload, olehUid)
}

/**
 * Nonaktifkan grup + cascade nonaktifkan opsinya — via SP.
 * SP `sp_dropdown_deactivate_group` handle guard is_system dan cascade.
 */
export async function MasterDropdownService_deactivateGroup(
  id: string,
  olehUid: string
): Promise<{ berhasil: boolean; group_id: string; opsi_dinonaktifkan: number }> {
  return dropdownRepo_deactivateGroup(id, olehUid)
}

/**
 * HARD DELETE grup + cascade hapus opsi (via FK ON DELETE CASCADE).
 * Dipakai untuk Tombol Hapus saat verdict cache = AMAN.
 * Guard is_system di-enforce di repository layer.
 *
 * S#124: ditambah untuk flow tabel cache (registry_safety_status).
 */
export async function MasterDropdownService_destroyGroup(
  id: string,
  _olehUid: string
): Promise<{ berhasil: boolean; group_id: string; opsi_dihapus: number }> {
  return dropdownRepo_destroyGroup(id)
}
