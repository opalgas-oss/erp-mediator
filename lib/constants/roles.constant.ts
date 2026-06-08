// lib/constants/roles.constant.ts
// Konstanta role user platform — satu-satunya sumber kebenaran untuk string role
//
// CATATAN PENTING:
//   - ROLE_DASHBOARD di lib/auth.ts dan DASHBOARD_ROLE_MAP di middleware.ts
//     TETAP di file masing-masing (keputusan Sesi #047 — BY DESIGN)
//   - File ini hanya mendefinisikan NILAI string role — bukan mapping
//   - Semua file yang pakai string role literal wajib import dari sini
//
// Dibuat: Sesi #049 — Step 6 ANALISIS v3
// Update: 8 Juni 2026 CASE SESI-12 — nilai diubah ke LOWERCASE (ATURAN 41 + ATURAN 44)
//   Keputusan Philips: AUTH = Normalized, ROLES = lowercase menyeluruh
//   Ref: KEPUTUSAN_AUTH_NORMALIZED_v1.md

/** Role yang tersedia di platform — nilai WAJIB lowercase (ATURAN 41) */
export const ROLES = {
  SUPERADMIN:    'super_admin',
  ADMIN_TENANT:  'admin_tenant',
  VENDOR:        'vendor',
  CUSTOMER:      'customer',
  DISPATCHER:    'dispatcher',
  FINANCE:       'finance',
  SUPPORT:       'support',
  PLATFORM_OWNER:'platform_owner',
} as const

/** Tipe union dari semua role yang valid */
export type RoleType = typeof ROLES[keyof typeof ROLES]

/** Role yang sudah aktif di Sprint 1 (ada dashboard-nya) */
export const ACTIVE_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN_TENANT,
  ROLES.VENDOR,
  ROLES.CUSTOMER,
] as const

/** Tipe union role yang sudah aktif */
export type ActiveRoleType = typeof ACTIVE_ROLES[number]
