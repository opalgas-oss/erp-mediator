// ARSIP: lib/constants/roles.constant.ts — sebelum fix casing lowercase (ATURAN 41)
// Disimpan: 8 Juni 2026 — CASE SESI-12
// Alasan: nilai ROLES masih uppercase — diubah ke lowercase sesuai ATURAN 41 + ATURAN 44

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

export type RoleType = typeof ROLES[keyof typeof ROLES]

export const ACTIVE_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN_TENANT,
  ROLES.VENDOR,
  ROLES.CUSTOMER,
] as const

export type ActiveRoleType = typeof ACTIVE_ROLES[number]
