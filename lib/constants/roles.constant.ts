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

/** Role yang tersedia di platform */
export const ROLES = {
  SUPERADMIN:    'SUPERADMIN',
  ADMIN_TENANT:  'ADMIN_TENANT',
  VENDOR:        'VENDOR',
  CUSTOMER:      'CUSTOMER',
  DISPATCHER:    'DISPATCHER',
  FINANCE:       'FINANCE',
  SUPPORT:       'SUPPORT',
  PLATFORM_OWNER:'PLATFORM_OWNER',
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
