// lib/utils/validation.server.ts
// Shared server-side validation helpers — validasi input bisnis.
//
// Fungsi di file ini adalah pure function — tidak ada IO, tidak ada DB.
// Dipakai oleh service layer untuk validasi input sebelum operasi DB/SP.
//
// Dibuat: Sesi #174 — SL-D003+K003: ekstrak validateNomorWa dari
//         tenant.service.ts + tenant-pic.service.ts (duplikasi identik)
// Update: Sesi #175 — SL-D010+K010: tambah validateDropdownSlug —
//         ekstrak dari master-dropdown-group.service.ts + master-dropdown-option.service.ts
// Update: Sesi #175 — SL-D011: tambah validateSortOrder —
//         ekstrak dari master-dropdown-group.service.ts + master-dropdown-option.service.ts
//
// Registry: code_registry.cr_functions
//   - validateNomorWa      — SECURITY/validation — is_shared=true
//   - validateDropdownSlug — SECURITY/validation — is_shared=true
//   - validateSortOrder    — SECURITY/validation — is_shared=true

import 'server-only'

// --- validateNomorWa ---------------------------------------------------------
/**
 * Validasi nomor WhatsApp — harus format 62xxx, panjang 10–15 digit.
 *
 * @param nomor - Nomor WA raw (boleh ada spasi, tanda hubung, tanda kurung)
 * @throws Error jika format tidak valid
 *
 * Dipakai oleh:
 *   - TenantService_create()            (lib/services/tenant.service.ts)
 *   - TenantService_update()            (lib/services/tenant.service.ts)
 *   - TenantPICService_gantiPIC()       (lib/services/tenant-pic.service.ts)
 *   - TenantPICService_tambahCadangan() (lib/services/tenant-pic.service.ts)
 *   - TenantPICService_updateCadangan() (lib/services/tenant-pic.service.ts)
 */
export function validateNomorWa(nomor: string): void {
  const clean = nomor.replace(/\D/g, '')
  if (!clean.startsWith('62') || clean.length < 10 || clean.length > 15) {
    throw new Error('Nomor WA harus format 62xxx (10-15 digit)')
  }
}

// --- validateDropdownSlug ----------------------------------------------------
const DROPDOWN_SLUG_REGEX = /^[a-z][a-z0-9_]*$/

/**
 * Validasi slug dropdown (grup atau opsi) — huruf kecil, angka, underscore,
 * diawali huruf kecil, panjang 2–64 karakter.
 *
 * @param slug - Slug yang akan divalidasi
 * @throws Error jika format tidak valid
 *
 * Dipakai oleh:
 *   - MasterDropdownService_createGroup()  (lib/services/master-dropdown-group.service.ts)
 *   - MasterDropdownService_createOption() (lib/services/master-dropdown-option.service.ts)
 */
export function validateDropdownSlug(slug: string): void {
  if (!slug || slug.length < 2 || slug.length > 64) {
    throw new Error('Slug harus 2-64 karakter')
  }
  if (!DROPDOWN_SLUG_REGEX.test(slug)) {
    throw new Error('Slug hanya boleh huruf kecil, angka, dan underscore (mulai dari huruf)')
  }
}

// --- validateSortOrder -------------------------------------------------------
/**
 * Validasi sort_order — harus bilangan bulat non-negatif (>= 0).
 *
 * @param value - Nilai sort_order yang akan divalidasi
 * @throws Error jika bukan integer atau nilai negatif
 *
 * Dipakai oleh:
 *   - MasterDropdownService_createGroup()  (lib/services/master-dropdown-group.service.ts)
 *   - MasterDropdownService_updateGroup()  (lib/services/master-dropdown-group.service.ts)
 *   - MasterDropdownService_createOption() (lib/services/master-dropdown-option.service.ts)
 *   - MasterDropdownService_updateOption() (lib/services/master-dropdown-option.service.ts)
 */
export function validateSortOrder(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Sort order harus bilangan bulat non-negatif')
  }
}
