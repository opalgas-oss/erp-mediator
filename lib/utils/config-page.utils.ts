// lib/utils/config-page.utils.ts
// Shared utilities untuk halaman Config Settings di SuperAdmin Dashboard.
//
// Dibuat: Sesi #163 — Fix T-028 (DRY) + T-027 (tipe 'text' tidak terhandle)
// Updated: Sesi #164 — T-029: tambah case tipeData='string' → 'text-field'
//
// SEBELUM: mapTipe() + mapValue() + JsonFieldConfig terduplikat identik di:
//   - app/dashboard/superadmin/settings/security-login/page.tsx
//   - app/dashboard/superadmin/settings/multi-role-policy/page.tsx
// SESUDAH: satu sumber kebenaran — kedua page import dari sini.
//
// T-027 FIX: tambah case tipeData='text' → 'text-field'
//   vendor_blocked_statuses memiliki tipe_data='text' di DB.
//   Sebelum fix: fallthrough ke 'number-unit' → render input number (salah).
//   Sesudah fix: return 'text-field' → render input text (benar).
//
// T-029 FIX: tambah case tipeData='string' → 'text-field'
//   platform_general.platform_timezone memiliki tipe_data='string' di DB.
//   Sebelum fix: fallthrough ke 'number-unit' → render input number (salah).
//   Sesudah fix: return 'text-field' → render input text (benar).
//
// ARSITEKTUR:
//   page.tsx (RSC) → import mapTipe, mapValue, JsonFieldConfig dari sini
//   → build ConfigItemData[] → pass ke ConfigPageClient

import type { ConfigItemData } from '@/components/ConfigItem'

// ─── Tipe ────────────────────────────────────────────────────────────────────

/**
 * Konfigurasi tipe per field JSON per-role.
 * Menentukan valueType dan opsi yang tersedia di PerRoleJsonEditor.
 */
export type JsonFieldConfig = {
  valueType:    'boolean' | 'number' | 'select'
  options?:     string[]
  allowedRoles?: ReadonlyArray<'customer' | 'vendor' | 'admin_tenant' | 'super_admin'>
}

/** Alias tipe untuk ConfigItemData['type'] — dipakai di return type mapTipe(). */
export type ConfigItemType = ConfigItemData['type']

// ─── Helper: deteksi field timing dari suffix nama kolom ─────────────────────

const TIMING_SUFFIXES = ['_seconds', '_minutes', '_hours', '_days'] as const

/**
 * Kembalikan true jika policyKey berakhiran suffix waktu (_seconds, _minutes, dst).
 * Dipakai mapTipe() untuk membedakan 'timing' dari 'number-unit'.
 */
export function isTimingField(policyKey: string): boolean {
  return TIMING_SUFFIXES.some((s) => policyKey.endsWith(s))
}

// ─── mapTipe ─────────────────────────────────────────────────────────────────

/**
 * Map tipe_data dari DB → type yang dipakai ConfigItem untuk render UI yang benar.
 *
 * Urutan check penting:
 *   boolean → toggle
 *   select  → select-only
 *   json    → json-per-role
 *   text    → text-field          ← T-027: vendor_blocked_statuses, policyKey opsional
 *   number + timing suffix → timing
 *   default → number-unit
 *
 * @param tipeData  - Nilai kolom tipe_data dari config_registry
 * @param policyKey - Nama key (opsional) — dipakai untuk cek timing suffix
 */
export function mapTipe(tipeData: string, policyKey?: string): ConfigItemType {
  if (tipeData === 'boolean')                                         return 'toggle'
  if (tipeData === 'select')                                          return 'select-only'
  if (tipeData === 'json')                                            return 'json-per-role'
  if (tipeData === 'text')                                            return 'text-field'
  if (tipeData === 'string')                                          return 'text-field'   // T-029: platform_timezone + field string lain
  if (tipeData === 'number' && policyKey && isTimingField(policyKey)) return 'timing'
  return 'number-unit'
}

// ─── mapValue ────────────────────────────────────────────────────────────────

/**
 * Map nilai string dari DB → tipe TypeScript yang sesuai untuk ConfigItem.
 *
 * @param nilai    - Nilai dari kolom `nilai` di config_registry (selalu string di DB)
 * @param tipeData - Nilai kolom tipe_data — menentukan konversi
 * @returns boolean untuk 'boolean', number untuk 'number', string untuk selainnya
 */
export function mapValue(nilai: string, tipeData: string): number | boolean | string {
  if (tipeData === 'boolean') return nilai === 'true'
  if (tipeData === 'number')  return Number(nilai)
  return nilai  // json, text, select → tetap string
}
