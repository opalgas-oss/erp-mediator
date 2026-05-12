// lib/services/permissions.service.ts
// Service layer untuk entitas permissions & role_permissions — business logic.
// Dipakai oleh: API route handlers di app/api/superadmin/permissions/ dan roles/[id]/permissions/
//
// ARSITEKTUR:
//   RSC / API Route → PermissionsService_* (file ini)
//                  → permissionsRepo_* + rolePermsRepo_*
//                  → DB
//
// 5 fungsi:
//   - PermissionsService_listPermissions  (list semua permission + role yang punya)
//   - PermissionsService_addPermission    (tambah permission baru — validasi code format)
//   - PermissionsService_updatePermission (edit description — code IMMUTABLE)
//   - PermissionsService_assignToRole     (assign permission ke role + guard duplikasi)
//   - PermissionsService_revokeFromRole   (revoke permission dari role)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import 'server-only'
import {
  permissionsRepo_findAll,
  permissionsRepo_findById,
  permissionsRepo_insert,
  permissionsRepo_updateDesc,
} from '@/lib/repositories/permissions.repository'
import {
  rolePermsRepo_assign,
  rolePermsRepo_revoke,
} from '@/lib/repositories/role-permissions.repository'
import { rolesRepo_findById } from '@/lib/repositories/roles.repository'
import type {
  Permission,
  PermissionWithRoles,
  CreatePermissionPayload,
} from '@/lib/types/roles-permissions.types'

// ─── Validation Helpers (lokal) ──────────────────────────────────────────────

/** Format {resource}.{action} — lowercase, titik tunggal sebagai pemisah */
const PERMISSION_CODE_REGEX = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/

function validatePermissionCode(code: string): void {
  if (!code || code.trim().length === 0) {
    throw new Error('Code permission tidak boleh kosong')
  }
  if (!PERMISSION_CODE_REGEX.test(code)) {
    throw new Error(
      'Format code permission salah. Gunakan format: {resource}.{action} ' +
      '(huruf kecil, titik sebagai pemisah). Contoh: order.refund, config.edit'
    )
  }
  if (code.length > 64) {
    throw new Error('Code permission maksimal 64 karakter')
  }
}

function validateDescription(description: string): void {
  if (!description || description.trim().length === 0) {
    throw new Error('Deskripsi permission tidak boleh kosong')
  }
  if (description.length > 200) {
    throw new Error('Deskripsi permission maksimal 200 karakter')
  }
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * List semua permission beserta role yang memilikinya.
 * Order: code ASC (alphabetical).
 */
export async function PermissionsService_listPermissions(): Promise<PermissionWithRoles[]> {
  return permissionsRepo_findAll()
}

// ─── Mutation ────────────────────────────────────────────────────────────────

/**
 * Tambah permission baru.
 * Validasi: format code {resource}.{action}, description tidak kosong.
 * Guard duplikasi di-handle DB (UNIQUE constraint pada code).
 */
export async function PermissionsService_addPermission(
  payload: CreatePermissionPayload
): Promise<Permission> {
  validatePermissionCode(payload.code)
  validateDescription(payload.description)

  return permissionsRepo_insert({
    code:        payload.code.trim().toLowerCase(),
    description: payload.description.trim(),
  })
}

/**
 * Update description permission. code tidak bisa diubah (IMMUTABLE).
 */
export async function PermissionsService_updatePermission(
  id: number,
  description: string
): Promise<Permission> {
  validateDescription(description)

  const existing = await permissionsRepo_findById(id)
  if (!existing) throw new Error('Permission tidak ditemukan')

  return permissionsRepo_updateDesc(id, description.trim())
}

/**
 * Assign permission ke role.
 * Validasi: role dan permission keduanya harus ada.
 * Guard duplikasi di repository (error code 23505 → pesan ramah).
 */
export async function PermissionsService_assignToRole(
  roleId: number,
  permissionId: number
): Promise<void> {
  const [role, permission] = await Promise.all([
    rolesRepo_findById(roleId),
    permissionsRepo_findById(permissionId),
  ])

  if (!role)       throw new Error('Role tidak ditemukan')
  if (!permission) throw new Error('Permission tidak ditemukan')

  await rolePermsRepo_assign(roleId, permissionId)
}

/**
 * Revoke permission dari role.
 * Validasi: role dan permission keduanya harus ada.
 * Idempotent — tidak error jika kombinasi tidak ditemukan.
 */
export async function PermissionsService_revokeFromRole(
  roleId: number,
  permissionId: number
): Promise<void> {
  const [role, permission] = await Promise.all([
    rolesRepo_findById(roleId),
    permissionsRepo_findById(permissionId),
  ])

  if (!role)       throw new Error('Role tidak ditemukan')
  if (!permission) throw new Error('Permission tidak ditemukan')

  await rolePermsRepo_revoke(roleId, permissionId)
}
