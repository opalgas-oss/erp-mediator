// lib/repositories/roles.repository.ts
// Repository untuk entitas roles — akses DB langsung (read-only).
// Dipakai oleh: roles.service.ts
//
// Roles bersifat FIXED (4 role) — tidak ada operasi INSERT/UPDATE/DELETE di layer ini.
// Semua operasi pada junction role_permissions → role-permissions.repository.ts
//
// 3 fungsi:
//   - rolesRepo_findAll          (list 4 role + permission count)
//   - rolesRepo_findById         (detail 1 role)
//   - rolesRepo_findWithPerms    (detail 1 role + assigned + available permissions)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  Role,
  RoleWithCount,
  RoleWithPermissions,
  Permission,
} from '@/lib/types/roles-permissions.types'

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Ambil semua role beserta jumlah permissions yang sudah di-assign.
 * Selalu return 4 row — roles bersifat FIXED.
 * Order: id ASC (customer=1, vendor=2, admin_tenant=3, super_admin=4).
 */
export async function rolesRepo_findAll(): Promise<RoleWithCount[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('roles')
    .select('id, code, description, role_permissions(count)')
    .order('id', { ascending: true })

  if (error) throw new Error(`[roles.repository] findAll: ${error.message}`)

  type RawRow = {
    id:               number
    code:             string
    description:      string | null
    role_permissions: { count: number }[]
  }

  return ((data ?? []) as unknown as RawRow[]).map((row) => ({
    id:               row.id,
    code:             row.code,
    description:      row.description,
    permission_count: (row.role_permissions?.[0] as unknown as { count: string })
                        ? parseInt((row.role_permissions[0] as unknown as { count: string }).count, 10)
                        : 0,
  }))
}

/**
 * Detail satu role by id. Return null jika tidak ditemukan.
 */
export async function rolesRepo_findById(id: number): Promise<Role | null> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('roles')
    .select('id, code, description')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`[roles.repository] findById: ${error.message}`)
  return data as Role | null
}

/**
 * Detail satu role + dua list permissions:
 *   - assigned  : permissions yang sudah ada di role_permissions WHERE role_id = id
 *   - available : permissions yang BELUM ada di role_permissions untuk role ini
 *
 * Menjalankan 3 query paralel: role, semua permissions, assigned permission ids.
 * Return null jika role tidak ditemukan.
 */
export async function rolesRepo_findWithPerms(
  roleId: number
): Promise<RoleWithPermissions | null> {
  const db = createServerSupabaseClient()

  const [roleResult, allPermsResult, assignedIdsResult] = await Promise.all([
    db.from('roles').select('id, code, description').eq('id', roleId).maybeSingle(),
    db.from('permissions').select('id, code, description').order('code', { ascending: true }),
    db.from('role_permissions').select('permission_id').eq('role_id', roleId),
  ])

  if (roleResult.error)
    throw new Error(`[roles.repository] findWithPerms role: ${roleResult.error.message}`)
  if (allPermsResult.error)
    throw new Error(`[roles.repository] findWithPerms allPerms: ${allPermsResult.error.message}`)
  if (assignedIdsResult.error)
    throw new Error(`[roles.repository] findWithPerms assignedIds: ${assignedIdsResult.error.message}`)

  if (!roleResult.data) return null

  const role = roleResult.data as Role
  const allPerms = (allPermsResult.data ?? []) as Permission[]
  const assignedIds = new Set(
    (assignedIdsResult.data ?? []).map((r: { permission_id: number }) => r.permission_id)
  )

  const assigned  = allPerms.filter(p => assignedIds.has(p.id))
  const available = allPerms.filter(p => !assignedIds.has(p.id))

  return { ...role, assigned, available }
}
