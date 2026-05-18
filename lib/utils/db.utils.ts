// lib/utils/db.utils.ts
// Utility DB — helper untuk operasi merge manual multi-query di repository layer.
//
// Fungsi:
//   - buildIdMap<T>  — konversi array item ke Record<id, item>
//
// Dipakai oleh:
//   - lib/repositories/complaint.repository.ts (2 call sites: tenantMap + profileMap)
//   - lib/repositories/user-membership.repository.ts (1 call site: profileMap)
//
// Dibuat: Sesi #181 — SL-D005+K006 ekstrak buildIdMap dari duplikasi di 2 repository
// Catatan: Menggantikan pola Object.fromEntries(array.map(x=>[x.id,x])) yang duplikat

import 'server-only'

/**
 * Konversi array item ke Record<id, item> untuk merge manual multi-query.
 * Menggantikan Object.fromEntries(array.map(x => [x.id, x])) yang duplikat di 2 file.
 *
 * @param items - Array item dengan field id: string
 * @returns Record keyed by id
 *
 * @example
 *   const tenantMap = buildIdMap((tenants ?? []) as unknown as TenantRow[])
 *   // setara dengan:
 *   // Object.fromEntries(((tenants ?? []) as unknown as TenantRow[]).map(t => [t.id, t]))
 */
export function buildIdMap<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map(item => [item.id, item]))
}
