// lib/services/master-dropdown-option.service.ts
// Service layer untuk entitas master_dropdown_options — business logic + validation.
// Dipakai oleh: API route handlers di app/api/superadmin/dropdowns/options/.
//
// ARSITEKTUR:
//   API Route → MasterDropdownService_* (file ini)
//             → dropdownRepo_* (master-dropdown-option.repository.ts + master-dropdown-group.repository.ts)
//             → DB
//
// Pemecahan service M4 (S#114): file ini fokus ke entitas OPTION saja.
// Operasi terhadap entitas GROUP → master-dropdown-group.service.ts.
//
// 3 fungsi:
//   - createOption, updateOption       (mutation)
//   - setDefaultOption                 (via SP — atomic + validasi platform-level)
//
// Dibuat: Sesi #114 — M4 Master Dropdown FASE 3 Step 3.4
// Update: Sesi #175 — SL-D010+K010: hapus validateSlug lokal, import validateDropdownSlug

import 'server-only'
import {
  dropdownRepo_insertOption,
  dropdownRepo_updateOption,
  dropdownRepo_setDefaultOption,
} from '@/lib/repositories/master-dropdown-option.repository'
import { dropdownRepo_findGroupById } from '@/lib/repositories/master-dropdown-group.repository'
import { validateDropdownSlug } from '@/lib/utils/validation.server'
import type {
  MasterDropdownOption,
  BuatOpsiPayload,
  UbahOpsiPayload,
} from '@/lib/types/master-dropdown.types'

// --- Validation Helpers (lokal) --------------------------------------------
// validateDropdownSlug -> lib/utils/validation.server.ts (SL-D010, S#175)

function validateLabel(label: string): void {
  if (!label || label.trim().length === 0) {
    throw new Error('Label opsi tidak boleh kosong')
  }
  if (label.length > 200) {
    throw new Error('Label opsi maksimal 200 karakter')
  }
}

function validateValueExists(payload: {
  numeric_value: number | null
  string_value:  string | null
  json_value:    Record<string, unknown> | null
}): void {
  const ada =
    payload.numeric_value !== null ||
    payload.string_value  !== null ||
    payload.json_value    !== null

  if (!ada) {
    throw new Error('Minimal salah satu dari numeric_value / string_value / json_value harus terisi')
  }
}

function validateSortOrder(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Sort order harus bilangan bulat non-negatif')
  }
}

// --- Mutation --------------------------------------------------------------

/**
 * Buat opsi baru di sebuah grup. Validasi:
 *  - slug, label, sort_order format valid
 *  - minimal salah satu kolom value terisi
 *  - grup target ada dan aktif
 *  - jika tenant_id terisi: grup harus tenant_can_override=true dan mode != 'none'
 */
export async function MasterDropdownService_createOption(
  payload: BuatOpsiPayload,
  olehUid: string
): Promise<MasterDropdownOption> {
  validateDropdownSlug(payload.slug)
  validateLabel(payload.label)
  validateSortOrder(payload.sort_order)
  validateValueExists(payload)

  // Validasi grup target ada
  const grup = await dropdownRepo_findGroupById(payload.group_id)
  if (!grup) {
    throw new Error('Grup dropdown tidak ditemukan')
  }
  if (!grup.is_active) {
    throw new Error('Grup dropdown tidak aktif — tidak bisa tambah opsi')
  }

  // Validasi tenant override (jika opsi tenant-specific)
  if (payload.tenant_id !== null) {
    if (!grup.tenant_can_override) {
      throw new Error('Grup ini tidak mengizinkan tenant override')
    }
    if (grup.tenant_override_mode === 'none') {
      throw new Error('Grup ini override-mode-nya none — tenant tidak boleh tambah opsi')
    }
  }

  return dropdownRepo_insertOption(payload, olehUid)
}

/**
 * Update opsi. Partial — hanya field yang diisi yang diupdate.
 * Validasi value: jika ada value baru di payload, pastikan tidak menghapus semua value
 * (logika ini dilakukan saat update real — di sini cukup pass-through ke repo karena
 *  partial update hanya menyentuh field yang dikirim).
 */
export async function MasterDropdownService_updateOption(
  id: string,
  payload: UbahOpsiPayload,
  olehUid: string
): Promise<MasterDropdownOption> {
  if (payload.label      !== undefined) validateLabel(payload.label)
  if (payload.sort_order !== undefined) validateSortOrder(payload.sort_order)

  return dropdownRepo_updateOption(id, payload, olehUid)
}

/**
 * Set satu opsi sebagai default di grup, unset opsi default lain — via SP.
 * SP `sp_dropdown_set_default_option` handle validasi opsi platform-level + atomic update.
 */
export async function MasterDropdownService_setDefaultOption(
  groupId: string,
  optionId: string,
  olehUid: string
): Promise<{ berhasil: boolean; option_id: string }> {
  return dropdownRepo_setDefaultOption(groupId, optionId, olehUid)
}
