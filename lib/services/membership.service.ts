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

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * List semua membership dengan filter + pagination.
 * Dipakai untuk halaman List Memberships (11.1).
 */
export async function MembershipService_listMemberships(
  params: MembershipListParams
): Promise<MembershipListResponse> {
  const page    = params.page    ?? 1
  const perPage = params.per_page ?? 50

  const { data, total } = await membershipRepo_findAll(params)

  return { data, total, page }
}

/**
 * Ambil info user + semua membership-nya.
 * Dipakai untuk halaman Detail User (11.2).
 * Throw error jika user tidak ditemukan.
 */
export async function MembershipService_getUserMemberships(
  userId: string
): Promise<UserWithMemberships> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID tidak valid')
  }

  const { user, memberships } = await membershipRepo_findByUserId(userId)

  if (!user) {
    throw new Error(`User dengan ID ${userId} tidak ditemukan`)
  }

  return { user, memberships }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Assign role baru ke user di tenant tertentu.
 *
 * URUTAN VALIDASI (S#169 — T-049 Fix):
 *   1. Parameter check (userId, tenantId, roleId wajib)
 *   2. Baca multi_role_policy dari config_registry (5 key)
 *   3. Fetch semua membership aktif user (reuse membershipRepo_findByUserId)
 *   4. Gate 1 — allow_multi_role: user tidak boleh punya >1 membership jika false
 *   5. Gate 2 — max_roles_per_user: batas total membership aktif
 *   6. Gate 3 — allow_multi_tenant: user tidak boleh aktif di tenant berbeda jika false
 *   7. Gate 4 — max_tenants_per_user: batas jumlah tenant unik yang user aktif di dalamnya
 *   8. Gate 5 — allow_simultaneous_roles: user tidak boleh punya >1 role di tenant SAMA jika false
 *   9. Duplikat check: kombinasi user+tenant+role (status active) sudah ada?
 *  10. Insert membership baru
 *
 * Return id membership baru jika sukses.
 * Throw error dengan pesan informatif untuk setiap gate yang gagal.
 */
export async function MembershipService_assignRole(
  userId:  string,
  payload: AssignRolePayload
): Promise<{ membership_id: string }> {
  // ── Validasi parameter wajib ───────────────────────────────────────────────
  if (!userId || !payload.tenant_id || !payload.role_id) {
    throw new Error('Parameter tidak lengkap: user_id, tenant_id, role_id wajib diisi')
  }

  // ── Baca multi_role_policy dari config_registry ───────────────────────────
  // getConfigValues sudah cached (unstable_cache TTL 300s, tag 'config').
  // Tidak ada network call tambahan jika cache masih valid.
  const cfg = await getConfigValues('multi_role_policy')

  const allowMultiRole      = parseConfigBoolean(cfg['allow_multi_role'],       true)
  const maxRolesPerUser     = parseConfigNumber( cfg['max_roles_per_user'],      3)
  const allowMultiTenant    = parseConfigBoolean(cfg['allow_multi_tenant'],      true)
  const maxTenantsPerUser   = parseConfigNumber( cfg['max_tenants_per_user'],    10)
  const allowSimultaneous   = parseConfigBoolean(cfg['allow_simultaneous_roles'], false)

  // ── Fetch semua membership aktif user (1 query, reuse fungsi existing) ────
  const { memberships: allMemberships } = await membershipRepo_findByUserId(userId)
  const activeMemberships = allMemberships.filter((m) => m.status === 'active')

  // ── Gate 1 — allow_multi_role ─────────────────────────────────────────────
  // Jika false: user hanya boleh punya tepat 1 membership aktif di seluruh platform.
  if (!allowMultiRole && activeMemberships.length >= 1) {
    throw new Error(
      'Multi-role tidak diizinkan di platform ini. User hanya boleh punya satu role aktif. ' +
      'Revoke role yang sudah ada terlebih dahulu.'
    )
  }

  // ── Gate 2 — max_roles_per_user ───────────────────────────────────────────
  // Batasan hard: jumlah membership aktif tidak boleh melebihi max_roles_per_user.
  if (activeMemberships.length >= maxRolesPerUser) {
    throw new Error(
      `User sudah memiliki ${activeMemberships.length} role aktif ` +
      `(maksimal ${maxRolesPerUser}). Revoke role lain terlebih dahulu.`
    )
  }

  // ── Gate 3 — allow_multi_tenant ───────────────────────────────────────────
  // Jika false: user hanya boleh aktif di 1 tenant.
  // Cek apakah ada membership aktif di tenant BERBEDA dari yang di-assign sekarang.
  if (!allowMultiTenant) {
    const hasOtherTenant = activeMemberships.some(
      (m) => m.tenant_id !== payload.tenant_id
    )
    if (hasOtherTenant) {
      throw new Error(
        'Multi-tenant tidak diizinkan di platform ini. ' +
        'User sudah aktif di tenant lain. Revoke keanggotaan di tenant tersebut terlebih dahulu.'
      )
    }
  }

  // ── Gate 4 — max_tenants_per_user ─────────────────────────────────────────
  // Hitung jumlah tenant unik yang user saat ini aktif di dalamnya.
  // Tenant yang di-assign sekarang: jika belum ada di set → akan menambah 1 slot.
  const activeTenantIds = new Set(activeMemberships.map((m) => m.tenant_id))
  const isNewTenant     = !activeTenantIds.has(payload.tenant_id)

  if (isNewTenant && activeTenantIds.size >= maxTenantsPerUser) {
    throw new Error(
      `User sudah aktif di ${activeTenantIds.size} tenant ` +
      `(maksimal ${maxTenantsPerUser}). Revoke keanggotaan di tenant lain terlebih dahulu.`
    )
  }

  // ── Gate 5 — allow_simultaneous_roles ─────────────────────────────────────
  // Jika false: user tidak boleh punya >1 role aktif di TENANT YANG SAMA.
  // (Berbeda dari allow_multi_role yang membatasi total global.)
  if (!allowSimultaneous) {
    const hasSameTenantRole = activeMemberships.some(
      (m) => m.tenant_id === payload.tenant_id
    )
    if (hasSameTenantRole) {
      throw new Error(
        'Simultaneous roles di satu tenant tidak diizinkan. ' +
        'User sudah memiliki role aktif di tenant ini. ' +
        'Revoke role tersebut terlebih dahulu.'
      )
    }
  }

  // ── Duplikat check ────────────────────────────────────────────────────────
  // Cek kombinasi user+tenant+role yang PERSIS SAMA (status active).
  // Gate ini tetap ada meski Gate 1-5 sudah lewat — defense in depth.
  const isDuplicate = await membershipRepo_checkExisting(
    userId,
    payload.tenant_id,
    payload.role_id
  )

  if (isDuplicate) {
    throw new Error(
      'User sudah memiliki role ini di tenant yang dipilih. Duplicate tidak diizinkan.'
    )
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const membershipId = await membershipRepo_insert(userId, payload)
  return { membership_id: membershipId }
}

/**
 * Revoke membership (soft delete — status → inactive).
 * Validasi: periksa apakah ini satu-satunya membership aktif user.
 * Jika ya → return warning, tapi tetap lanjut revoke (SuperAdmin yang memutuskan).
 */
export async function MembershipService_revokeRole(
  userId:       string,
  membershipId: string
): Promise<{ success: boolean; is_last_membership: boolean }> {
  if (!membershipId || !userId) {
    throw new Error('membership_id dan user_id wajib diisi')
  }

  // Cek apakah ini satu-satunya membership aktif user
  const { memberships } = await membershipRepo_findByUserId(userId)
  const activeMemberships = memberships.filter((m) => m.status === 'active')
  const isLast = activeMemberships.length <= 1

  const success = await membershipRepo_revoke(membershipId)

  if (!success) {
    throw new Error('Membership tidak ditemukan atau sudah inactive')
  }

  return { success: true, is_last_membership: isLast }
}
