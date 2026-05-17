// ARSIP PRE-T052 — lib/services/membership.service.ts
// Kondisi: post-T049 (S#169), pre-T052 (S#170)
// lib/services/membership.service.ts
// Service layer untuk M8 User Membership Management — business logic + validasi.
// Dipakai oleh: API route handlers di app/api/superadmin/memberships/
//
// ARSITEKTUR:
//   RSC / API Route → MembershipService_* (file ini)
//                  → membershipRepo_* (user-membership.repository.ts)
//                  → DB
//
// 4 fungsi:
//   - MembershipService_listMemberships    (list + filter + pagination)
//   - MembershipService_getUserMemberships (user info + semua membership)
//   - MembershipService_assignRole         (assign + 5 policy gate dari config_registry)
//   - MembershipService_revokeRole         (revoke dengan last-membership check)
//
// Dibuat: Sesi #136 — M8 User Membership Management
// PERUBAHAN Sesi #169 — Fix T-049 (multi_role_policy LOOP):
//   MembershipService_assignRole() sebelumnya tidak baca config_registry sama sekali.
//   SA bisa set allow_multi_role=false atau max_roles_per_user=1 → tidak ada efek.
//   Fix: tambah 5 gate check via getConfigValues('multi_role_policy') sebelum insert.
//   Gates: allow_multi_role, max_roles_per_user, allow_multi_tenant,
//          max_tenants_per_user, allow_simultaneous_roles.
//   auto_assign_customer_role (T-049b): dikerjakan di registration flow, bukan di sini.

import 'server-only'
import {
  membershipRepo_findAll,
  membershipRepo_findByUserId,
  membershipRepo_insert,
  membershipRepo_revoke,
  membershipRepo_checkExisting,
} from '@/lib/repositories/user-membership.repository'
import {
  getConfigValues,
  parseConfigNumber,
  parseConfigBoolean,
} from '@/lib/config-registry'
import type {
  MembershipListParams,
  MembershipListResponse,
  UserWithMemberships,
  AssignRolePayload,
} from '@/lib/types/user-membership.types'

export async function MembershipService_listMemberships(params: MembershipListParams): Promise<MembershipListResponse> {
  const page    = params.page    ?? 1
  const perPage = params.per_page ?? 50
  const { data, total } = await membershipRepo_findAll(params)
  return { data, total, page }
}

export async function MembershipService_getUserMemberships(userId: string): Promise<UserWithMemberships> {
  if (!userId || typeof userId !== 'string') throw new Error('User ID tidak valid')
  const { user, memberships } = await membershipRepo_findByUserId(userId)
  if (!user) throw new Error(`User dengan ID ${userId} tidak ditemukan`)
  return { user, memberships }
}

export async function MembershipService_assignRole(userId: string, payload: AssignRolePayload): Promise<{ membership_id: string }> {
  if (!userId || !payload.tenant_id || !payload.role_id) throw new Error('Parameter tidak lengkap: user_id, tenant_id, role_id wajib diisi')
  const cfg = await getConfigValues('multi_role_policy')
  const allowMultiRole    = parseConfigBoolean(cfg['allow_multi_role'],       true)
  const maxRolesPerUser   = parseConfigNumber( cfg['max_roles_per_user'],      3)
  const allowMultiTenant  = parseConfigBoolean(cfg['allow_multi_tenant'],      true)
  const maxTenantsPerUser = parseConfigNumber( cfg['max_tenants_per_user'],    10)
  const allowSimultaneous = parseConfigBoolean(cfg['allow_simultaneous_roles'], false)
  const { memberships: allMemberships } = await membershipRepo_findByUserId(userId)
  const activeMemberships = allMemberships.filter((m) => m.status === 'active')
  if (!allowMultiRole && activeMemberships.length >= 1) throw new Error('Multi-role tidak diizinkan di platform ini. User hanya boleh punya satu role aktif. Revoke role yang sudah ada terlebih dahulu.')
  if (activeMemberships.length >= maxRolesPerUser) throw new Error(`User sudah memiliki ${activeMemberships.length} role aktif (maksimal ${maxRolesPerUser}). Revoke role lain terlebih dahulu.`)
  if (!allowMultiTenant) { const hasOtherTenant = activeMemberships.some((m) => m.tenant_id !== payload.tenant_id); if (hasOtherTenant) throw new Error('Multi-tenant tidak diizinkan di platform ini. User sudah aktif di tenant lain. Revoke keanggotaan di tenant tersebut terlebih dahulu.') }
  const activeTenantIds = new Set(activeMemberships.map((m) => m.tenant_id))
  const isNewTenant = !activeTenantIds.has(payload.tenant_id)
  if (isNewTenant && activeTenantIds.size >= maxTenantsPerUser) throw new Error(`User sudah aktif di ${activeTenantIds.size} tenant (maksimal ${maxTenantsPerUser}). Revoke keanggotaan di tenant lain terlebih dahulu.`)
  if (!allowSimultaneous) { const hasSameTenantRole = activeMemberships.some((m) => m.tenant_id === payload.tenant_id); if (hasSameTenantRole) throw new Error('Simultaneous roles di satu tenant tidak diizinkan. User sudah memiliki role aktif di tenant ini. Revoke role tersebut terlebih dahulu.') }
  const isDuplicate = await membershipRepo_checkExisting(userId, payload.tenant_id, payload.role_id)
  if (isDuplicate) throw new Error('User sudah memiliki role ini di tenant yang dipilih. Duplicate tidak diizinkan.')
  const membershipId = await membershipRepo_insert(userId, payload)
  return { membership_id: membershipId }
}

export async function MembershipService_revokeRole(userId: string, membershipId: string): Promise<{ success: boolean; is_last_membership: boolean }> {
  if (!membershipId || !userId) throw new Error('membership_id dan user_id wajib diisi')
  const { memberships } = await membershipRepo_findByUserId(userId)
  const activeMemberships = memberships.filter((m) => m.status === 'active')
  const isLast = activeMemberships.length <= 1
  const success = await membershipRepo_revoke(membershipId)
  if (!success) throw new Error('Membership tidak ditemukan atau sudah inactive')
  return { success: true, is_last_membership: isLast }
}
