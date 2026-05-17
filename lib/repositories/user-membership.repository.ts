// lib/repositories/user-membership.repository.ts
// Repository untuk entitas user_memberships — akses DB langsung.
// Dipakai oleh: membership.service.ts
//
// 5 fungsi:
//   - membershipRepo_findAll         (list + filter + pagination, JOIN user_profiles + tenants + roles)
//   - membershipRepo_findByUserId    (semua membership satu user, JOIN tenant + role)
//   - membershipRepo_insert          (assign role baru — INSERT ke user_memberships)
//   - membershipRepo_revoke          (soft delete — UPDATE status → inactive)
//   - membershipRepo_checkExisting   (cek duplikat kombinasi user+tenant+role)
//
// Dibuat: Sesi #136 — M8 User Membership Management

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  MembershipWithDetails,
  MembershipRow,
  UserInfo,
  MembershipListParams,
  AssignRolePayload,
} from '@/lib/types/user-membership.types'

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Ambil semua membership dengan join ke tenants + roles (ada FK public).
 * user_profiles di-fetch terpisah karena user_memberships.user_id FK ke auth.users
 * (bukan public.user_profiles) — Supabase SDK tidak bisa auto-join cross-schema.
 *
 * Pendekatan: 2 query paralel → merge manual.
 * Query 1: user_memberships + tenants + roles (pagination + filter DB)
 * Query 2: user_profiles WHERE id IN (user_ids dari hasil Q1)
 */
export async function membershipRepo_findAll(
  params: MembershipListParams
): Promise<{ data: MembershipWithDetails[]; total: number }> {
  const db = createServerSupabaseClient()

  const page     = params.page     ?? 1
  const per_page = params.per_page ?? 50
  const offset   = (page - 1) * per_page

  // ── Query 1: memberships + tenants + roles ─────────────────────────────────
  type RawRow = {
    id:         string
    user_id:    string
    tenant_id:  string
    role_id:    number
    status:     string
    created_at: string
    updated_at: string
    tenants:    { nama_brand: string }
    roles:      { code: string }
  }

  let q1 = db
    .from('user_memberships')
    .select(
      `id, user_id, tenant_id, role_id, status, created_at, updated_at,
       tenants!inner(nama_brand),
       roles!inner(code)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1)

  if (params.tenant_id) q1 = q1.eq('tenant_id', params.tenant_id)
  if (params.role_id)   q1 = q1.eq('role_id', params.role_id)
  if (params.status && params.status !== 'all') q1 = q1.eq('status', params.status)

  const { data: rawData, error: q1Error, count } = await q1

  if (q1Error) throw new Error(`[user-membership.repository] findAll q1: ${q1Error.message}`)

  const rows = (rawData ?? []) as unknown as RawRow[]

  // ── Query 2: user_profiles untuk user_ids dari hasil Q1 ───────────────────
  const userIds = [...new Set(rows.map(r => r.user_id))]

  type ProfileRow = { id: string; nama: string; email: string }
  let profileMap: Record<string, ProfileRow> = {}

  if (userIds.length > 0) {
    const { data: profiles, error: q2Error } = await db
      .from('user_profiles')
      .select('id, nama, email')
      .in('id', userIds)

    if (q2Error) throw new Error(`[user-membership.repository] findAll q2: ${q2Error.message}`)

    profileMap = Object.fromEntries(
      ((profiles ?? []) as unknown as ProfileRow[]).map(p => [p.id, p])
    )
  }

  // ── Merge ──────────────────────────────────────────────────────────────────
  let mapped: MembershipWithDetails[] = rows.map(row => ({
    id:          row.id,
    user_id:     row.user_id,
    tenant_id:   row.tenant_id,
    role_id:     row.role_id,
    status:      row.status as 'active' | 'inactive',
    created_at:  row.created_at,
    updated_at:  row.updated_at,
    user_nama:   profileMap[row.user_id]?.nama  ?? '',
    user_email:  profileMap[row.user_id]?.email ?? '',
    tenant_nama: (row.tenants as { nama_brand: string })?.nama_brand ?? '',
    role_code:   (row.roles   as { code: string })?.code             ?? '',
  }))

  // Filter search post-merge (nama atau email)
  if (params.search) {
    const q = params.search.toLowerCase()
    mapped = mapped.filter(
      m => m.user_nama.toLowerCase().includes(q) || m.user_email.toLowerCase().includes(q)
    )
  }

  return { data: mapped, total: count ?? 0 }
}

/**
 * Ambil info user (dari user_profiles) + semua membership-nya (JOIN tenant + role).
 * Dipakai untuk halaman Detail User (11.2).
 * Return null untuk user_info jika user tidak ditemukan.
 */
export async function membershipRepo_findByUserId(
  userId: string
): Promise<{ user: UserInfo | null; memberships: MembershipRow[] }> {
  const db = createServerSupabaseClient()

  const [userResult, membershipsResult] = await Promise.all([
    db
      .from('user_profiles')
      .select('id, nama, email, nomor_wa, created_at')
      .eq('id', userId)
      .maybeSingle(),
    db
      .from('user_memberships')
      .select(
        `id, tenant_id, role_id, status, created_at, updated_at,
         tenants!inner(nama_brand),
         roles!inner(code)`
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  if (userResult.error)
    throw new Error(`[user-membership.repository] findByUserId user: ${userResult.error.message}`)
  if (membershipsResult.error)
    throw new Error(`[user-membership.repository] findByUserId memberships: ${membershipsResult.error.message}`)

  type RawMembershipRow = {
    id:         string
    tenant_id:  string
    role_id:    number
    status:     string
    created_at: string
    updated_at: string
    tenants:    { nama_brand: string }
    roles:      { code: string }
  }

  const memberships = ((membershipsResult.data ?? []) as unknown as RawMembershipRow[]).map(
    (row) => ({
      id:          row.id,
      tenant_id:   row.tenant_id,
      tenant_nama: row.tenants?.nama_brand ?? '',
      role_id:     row.role_id,
      role_code:   row.roles?.code ?? '',
      status:      row.status as 'active' | 'inactive',
      created_at:  row.created_at,
      updated_at:  row.updated_at,
    })
  )

  return {
    user:        (userResult.data as UserInfo | null),
    memberships,
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Insert membership baru (assign role ke user di tenant tertentu).
 * Return id membership yang baru dibuat.
 */
export async function membershipRepo_insert(
  userId: string,
  payload: AssignRolePayload
): Promise<string> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('user_memberships')
    .insert({
      user_id:   userId,
      tenant_id: payload.tenant_id,
      role_id:   payload.role_id,
      status:    'active',
    })
    .select('id')
    .single()

  if (error) throw new Error(`[user-membership.repository] insert: ${error.message}`)
  return (data as { id: string }).id
}

/**
 * Revoke membership — soft delete, update status → inactive.
 * Return false jika membership tidak ditemukan atau sudah inactive.
 */
export async function membershipRepo_revoke(membershipId: string): Promise<boolean> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('user_memberships')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', membershipId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`[user-membership.repository] revoke: ${error.message}`)
  return data !== null
}

/**
 * Cek apakah kombinasi user+tenant+role sudah ada dengan status active.
 * Dipakai service sebelum insert untuk cegah duplikat.
 */
export async function membershipRepo_checkExisting(
  userId:   string,
  tenantId: string,
  roleId:   number
): Promise<boolean> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('user_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('role_id', roleId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(`[user-membership.repository] checkExisting: ${error.message}`)
  return data !== null
}

/**
 * Cek apakah slot tenant+role sudah ditempati user LAIN yang aktif.
 *
 * Dipakai untuk gate allow_account_sharing (T-052):
 * Jika allow_account_sharing=false, satu slot (tenant_id + role_id)
 * hanya boleh dipegang oleh satu user aktif di waktu yang sama.
 * User yang sedang di-assign (excludeUserId) tidak dihitung sebagai 'lain'.
 *
 * @param tenantId      - Tenant ID yang akan di-assign
 * @param roleId        - Role ID yang akan di-assign
 * @param excludeUserId - UID user yang sedang diproses (dikecualikan dari pengecekan)
 * @returns true jika slot sudah ditempati user lain
 */
export async function membershipRepo_checkRoleSlotOccupied(
  tenantId:      string,
  roleId:        number,
  excludeUserId: string
): Promise<boolean> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('user_memberships')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('role_id', roleId)
    .eq('status', 'active')
    .neq('user_id', excludeUserId)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`[user-membership.repository] checkRoleSlotOccupied: ${error.message}`)
  return data !== null
}
