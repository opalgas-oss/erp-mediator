// lib/repositories/role-permissions.repository.ts
// Repository untuk junction table role_permissions — assign & revoke saja.
// Dipakai oleh: permissions.service.ts
//
// 2 fungsi:
//   - rolePermsRepo_assign   (INSERT ke role_permissions)
//   - rolePermsRepo_revoke   (DELETE dari role_permissions)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Mutation ────────────────────────────────────────────────────────────────

/**
 * Assign permission ke role — INSERT ke role_permissions.
 * Guard duplikasi di-handle DB (UNIQUE constraint role_id + permission_id).
 */
export async function rolePermsRepo_assign(
  roleId: number,
  permissionId: number
): Promise<void> {
  const db = createServerSupabaseClient()

  const { error } = await db
    .from('role_permissions')
    .insert({ role_id: roleId, permission_id: permissionId })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Permission ini sudah ada di role tersebut.')
    }
    throw new Error(`[role-permissions.repository] assign: ${error.message}`)
  }
}

/**
 * Revoke permission dari role — DELETE dari role_permissions.
 * Tidak error jika kombinasi tidak ditemukan (idempotent).
 */
export async function rolePermsRepo_revoke(
  roleId: number,
  permissionId: number
): Promise<void> {
  const db = createServerSupabaseClient()

  const { error } = await db
    .from('role_permissions')
    .delete()
    .eq('role_id',       roleId)
    .eq('permission_id', permissionId)

  if (error) throw new Error(`[role-permissions.repository] revoke: ${error.message}`)
}
