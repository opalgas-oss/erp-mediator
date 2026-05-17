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
//   - MembershipService_assignRole         (assign dengan duplikat check)
//   - MembershipService_revokeRole         (revoke dengan last-membership check)
//
// Dibuat: Sesi #136 — M8 User Membership Management

import 'server-only'
import {
  membershipRepo_findAll,
  membershipRepo_findByUserId,
  membershipRepo_insert,
  membershipRepo_revoke,
  membershipRepo_checkExisting,
} from '@/lib/repositories/user-membership.repository'
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
 * Validasi: cek duplikat kombinasi user+tenant+role (status active).
 * Return id membership baru jika sukses.
 * Throw error dengan pesan informatif jika gagal validasi.
 */
export async function MembershipService_assignRole(
  userId:  string,
  payload: AssignRolePayload
): Promise<{ membership_id: string }> {
  if (!userId || !payload.tenant_id || !payload.role_id) {
    throw new Error('Parameter tidak lengkap: user_id, tenant_id, role_id wajib diisi')
  }

  // Cek duplikat: user sudah punya role ini di tenant ini (active)
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
