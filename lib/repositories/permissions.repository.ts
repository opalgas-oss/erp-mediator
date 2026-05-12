// lib/repositories/permissions.repository.ts
// Repository untuk entitas permissions — akses DB langsung.
// Dipakai oleh: permissions.service.ts
//
// Operasi assign/revoke (junction role_permissions) → role-permissions.repository.ts
//
// 4 fungsi:
//   - permissionsRepo_findAll         (list semua permission + role yang punya)
//   - permissionsRepo_findById        (detail 1 permission)
//   - permissionsRepo_insert          (tambah permission baru)
//   - permissionsRepo_updateDesc      (edit description — code IMMUTABLE)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  Permission,
  PermissionWithRoles,
  CreatePermissionPayload,
} from '@/lib/types/roles-permissions.types'

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Ambil semua permissions beserta role yang memilikinya.
 * Order: code ASC (alphabetical).
 */
export async function permissionsRepo_findAll(): Promise<PermissionWithRoles[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('permissions')
    .select('id, code, description, role_permissions(role_id, roles(id, code))')
    .order('code', { ascending: true })

  if (error) throw new Error(`[permissions.repository] findAll: ${error.message}`)

  type RawRow = {
    id:               number
    code:             string
    description:      string | null
    role_permissions: { role_id: number; roles: { id: number; code: string } | null }[]
  }

  return ((data ?? []) as unknown as RawRow[]).map((row) => ({
    id:          row.id,
    code:        row.code,
    description: row.description,
    roles:       (row.role_permissions ?? [])
                   .map(rp => rp.roles)
                   .filter((r): r is { id: number; code: string } => r !== null),
  }))
}

/**
 * Detail satu permission by id. Return null jika tidak ditemukan.
 */
export async function permissionsRepo_findById(id: number): Promise<Permission | null> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('permissions')
    .select('id, code, description')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`[permissions.repository] findById: ${error.message}`)
  return data as Permission | null
}

// ─── Mutation ────────────────────────────────────────────────────────────────

/**
 * Insert permission baru.
 * code harus unik dan format {resource}.{action} — validasi di service layer.
 */
export async function permissionsRepo_insert(
  payload: CreatePermissionPayload
): Promise<Permission> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('permissions')
    .insert({
      code:        payload.code,
      description: payload.description,
    })
    .select('id, code, description')
    .single()

  if (error) throw new Error(`[permissions.repository] insert: ${error.message}`)
  return data as Permission
}

/**
 * Update description permission. code tidak bisa diubah (IMMUTABLE).
 */
export async function permissionsRepo_updateDesc(
  id: number,
  description: string
): Promise<Permission> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('permissions')
    .update({ description })
    .eq('id', id)
    .select('id, code, description')
    .single()

  if (error) throw new Error(`[permissions.repository] updateDesc: ${error.message}`)
  return data as Permission
}
