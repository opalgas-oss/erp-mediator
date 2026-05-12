// lib/types/roles-permissions.types.ts
// Tipe data untuk M7 Roles & Permissions Management.
// Dipakai oleh: roles.repository.ts, permissions.repository.ts,
//               role-permissions.repository.ts, roles.service.ts,
//               permissions.service.ts, dan komponen UI M7.
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

// ─── Role ─────────────────────────────────────────────────────────────────────

/**
 * Satu baris dari tabel `roles`.
 * 4 role bersifat FIXED — tidak bisa tambah/hapus via UI.
 * code: customer | vendor | admin_tenant | super_admin
 */
export interface Role {
  id:          number       // smallint PK
  code:        string       // UNIQUE, IMMUTABLE
  description: string | null
}

/**
 * Role lengkap dengan jumlah permissions yang sudah di-assign.
 * Dipakai untuk halaman List Roles — menampilkan badge count per role.
 */
export interface RoleWithCount extends Role {
  permission_count: number
}

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Satu baris dari tabel `permissions`.
 * code bersifat IMMUTABLE setelah dibuat — hanya description yang bisa diubah.
 * Format code: {resource}.{action} — contoh: order.refund, config.edit
 */
export interface Permission {
  id:          number       // smallserial PK
  code:        string       // UNIQUE, IMMUTABLE
  description: string | null
}

/**
 * Permission dengan info role mana saja yang memilikinya.
 * Dipakai untuk halaman List Permissions — menampilkan badge role per permission.
 */
export interface PermissionWithRoles extends Permission {
  roles: Pick<Role, 'id' | 'code'>[]
}

// ─── Role + Permissions Detail ────────────────────────────────────────────────

/**
 * Detail lengkap satu role: info role + dua list permissions.
 * Dipakai untuk halaman Detail Role — layout dua panel (assigned / available).
 */
export interface RoleWithPermissions extends Role {
  /** Permissions yang sudah di-assign ke role ini */
  assigned:  Permission[]
  /** Permissions yang belum di-assign — tersedia untuk ditambahkan */
  available: Permission[]
}

// ─── Payload ──────────────────────────────────────────────────────────────────

/**
 * Payload untuk tambah permission baru.
 * code wajib format {resource}.{action} — lowercase, titik sebagai pemisah.
 */
export interface CreatePermissionPayload {
  code:        string
  description: string
}

/**
 * Payload untuk edit description permission yang sudah ada.
 * code tidak bisa diubah (IMMUTABLE) — hanya description.
 */
export interface UpdatePermissionPayload {
  description: string
}

/**
 * Payload untuk assign/revoke permission ke role.
 */
export interface AssignRevokePayload {
  role_id:       number
  permission_id: number
}
