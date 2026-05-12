// lib/types/user-membership.types.ts
// Tipe data untuk M8 User Membership Management.
// Dipakai oleh: user-membership.repository.ts, membership.service.ts,
//               API routes M8, dan komponen UI M8.
// Dibuat: Sesi #136 — M8 User Membership Management

// ─── Membership Core ──────────────────────────────────────────────────────────

/**
 * Satu baris dari tabel `user_memberships`.
 * Setiap baris = 1 user punya 1 role di 1 tenant.
 */
export interface Membership {
  id:         string    // uuid PK
  user_id:    string    // FK → auth.users.id
  tenant_id:  string    // FK → tenants.id
  role_id:    number    // smallint FK → roles.id
  status:     'active' | 'inactive'
  created_at: string    // timestamptz
  updated_at: string    // timestamptz
}

/**
 * Membership lengkap dengan join ke user_profiles, tenants, dan roles.
 * Dipakai untuk halaman List Memberships (tabel utama per halaman 11.1).
 */
export interface MembershipWithDetails extends Membership {
  user_nama:   string
  user_email:  string
  tenant_nama: string   // tenants.nama_brand
  role_code:   string   // roles.code
}

/**
 * Membership untuk tampilan di halaman Detail User (tabel bawah halaman 11.2).
 * Lebih ringkas — user sudah diketahui dari konteks halaman.
 */
export interface MembershipRow {
  id:          string
  tenant_nama: string
  tenant_id:   string
  role_id:     number
  role_code:   string
  status:      'active' | 'inactive'
  created_at:  string
  updated_at:  string
}

// ─── User Info ────────────────────────────────────────────────────────────────

/**
 * Informasi singkat user dari user_profiles.
 * Dipakai di Card "Informasi User" pada halaman Detail (11.2).
 */
export interface UserInfo {
  id:         string
  nama:       string
  email:      string
  nomor_wa:   string | null
  created_at: string
}

/**
 * User lengkap dengan semua memberships-nya.
 * Dipakai untuk API response GET /memberships/[uid].
 */
export interface UserWithMemberships {
  user:        UserInfo
  memberships: MembershipRow[]
}

// ─── Payload ──────────────────────────────────────────────────────────────────

/**
 * Payload untuk assign role baru ke user di tenant tertentu.
 * POST /api/superadmin/memberships/[uid]/assign
 */
export interface AssignRolePayload {
  tenant_id: string
  role_id:   number
}

/**
 * Hasil validasi sebelum assign role.
 * Dipakai service untuk kirim error yang informatif.
 */
export interface AssignValidationResult {
  ok:      boolean
  reason?: 'duplicate_active' | 'max_roles_exceeded' | 'tenant_not_found' | 'role_not_found'
  message?: string
}

// ─── Query Params ─────────────────────────────────────────────────────────────

/**
 * Query params untuk GET /api/superadmin/memberships (list + filter + pagination).
 */
export interface MembershipListParams {
  search?:    string    // cari by nama atau email
  tenant_id?: string
  role_id?:   number
  status?:    'active' | 'inactive' | 'all'
  page?:      number    // default 1
  per_page?:  number    // default 50
}

/**
 * Response pagination untuk list memberships.
 */
export interface MembershipListResponse {
  data:  MembershipWithDetails[]
  total: number
  page:  number
}
