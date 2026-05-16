// lib/utils/config-page.utils.ts
// Shared utilities untuk halaman Config Settings di SuperAdmin Dashboard.
//
// Dibuat: Sesi #163 — Fix T-028 (DRY) + T-027 (tipe 'text' tidak terhandle)
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
// ARSITEKTUR:
//   page.tsx (RSC) → import mapTipe, mapValue, JsonFieldConfig dari sini
//   → build ConfigItemData[] → pass ke ConfigPageClient

import type { ConfigItemData } from '@/components/ConfigItem'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export type JsonFieldConfig = {
  valueType: 'boolean' | 'number' | 'select'
  options?:  string[]
}

export type ConfigItemType = ConfigItemData['type']

// ─── Helper: deteksi field timing dari suffix nama kolom ─────────────────────

const TIMING_SUFFIXES = ['_seconds', '_minutes', '_hours', '_days'] as const

export function isTimingField(policyKey: string): boolean {
  return TIMING_SUFFIXES.some((s) => policyKey.endsWith(s))
}

// ─── mapTipe ─────────────────────────────────────────────────────────────────

export function mapTipe(tipeData: string, policyKey?: string): ConfigItemType {
  if (tipeData === 'boolean')                                         return 'toggle'
  if (tipeData === 'select')                                          return 'select-only'
  if (tipeData === 'json')                                            return 'json-per-role'
  if (tipeData === 'text')                                            return 'text-field'
  if (tipeData === 'number' && policyKey && isTimingField(policyKey)) return 'timing'
  return 'number-unit'
}

// ─── mapValue ────────────────────────────────────────────────────────────────

export function mapValue(nilai: string, tipeData: string): number | boolean | string {
  if (tipeData === 'boolean') return nilai === 'true'
  if (tipeData === 'number')  return Number(nilai)
  return nilai
}
