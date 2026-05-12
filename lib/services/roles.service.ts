// lib/services/roles.service.ts
// Service layer untuk entitas roles — business logic (read-only).
// Dipakai oleh: API route handlers di app/api/superadmin/roles/
//
// ARSITEKTUR:
//   RSC / API Route → RolesService_* (file ini)
//                  → rolesRepo_* (roles.repository.ts)
//                  → DB
//
// Roles bersifat FIXED — tidak ada createRole / deleteRole di service ini.
// Operasi assign/revoke permissions → permissions.service.ts
//
// 2 fungsi:
//   - RolesService_listRoles     (list 4 role + permission count)
//   - RolesService_getRoleDetail (detail role + assigned + available permissions)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import 'server-only'
import {
  rolesRepo_findAll,
  rolesRepo_findWithPerms,
} from '@/lib/repositories/roles.repository'
import type {
  RoleWithCount,
  RoleWithPermissions,
} from '@/lib/types/roles-permissions.types'

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * List semua role beserta jumlah permissions yang sudah di-assign.
 * Selalu return 4 item. Order: id ASC.
 */
export async function RolesService_listRoles(): Promise<RoleWithCount[]> {
  return rolesRepo_findAll()
}

/**
 * Detail satu role beserta dua list permissions (assigned + available).
 * Return null jika role tidak ditemukan (id tidak valid).
 */
export async function RolesService_getRoleDetail(
  roleId: number
): Promise<RoleWithPermissions | null> {
  if (!Number.isInteger(roleId) || roleId < 1) {
    throw new Error('ID role tidak valid')
  }
  return rolesRepo_findWithPerms(roleId)
}
