// lib/constants/index.ts
// Barrel export — semua konstanta diakses dari sini
//
// Contoh penggunaan:
//   import { ROLES, VENDOR_STATUS } from '@/lib/constants'
//   import { ICON_NAV, ICON_ACTION } from '@/lib/constants'
//   import { NAV_CLS, TYPOGRAPHY, BADGE_KATEGORI } from '@/lib/constants'
//   import { resolvePageMeta } from '@/lib/constants'
//   import { SA_NAV_GROUPS } from '@/lib/constants'
//
// Dibuat: Sesi #049
// Updated: Sesi #100 — tambah icons, nav, ui-tokens, page-meta

export { ROLES, ACTIVE_ROLES } from './roles.constant'
export type { RoleType, ActiveRoleType } from './roles.constant'

export { VENDOR_STATUS, VENDOR_LOGIN_ALLOWED } from './vendor-status.constant'
export type { VendorStatusType } from './vendor-status.constant'

export { SESSION_STATUS } from './session-status.constant'
export type { SessionStatusType } from './session-status.constant'

export { OTP_TYPE } from './otp-type.constant'
export type { OTPTypeValue } from './otp-type.constant'

export { ACCOUNT_LOCK_STATUS, UNLOCK_METHOD } from './account-lock-status.constant'
export type { AccountLockStatusType, UnlockMethodType } from './account-lock-status.constant'

// ─── Icon Registry — WAJIB dipakai, jangan import langsung dari lucide-react ──
export {
  ICON_NAV,
  ICON_ACTION,
  ICON_STATUS,
  ICON_DATA,
  ICON_ENTITY,
  ICON_COMM,
  ICON_TIME,
  ICON_LOCATION,
} from './icons.constant'
export type { LucideIcon } from './icons.constant'

// ─── UI — Navigasi, Typography, Warna, Scroll ─────────────────────────────────
export {
  SA_NAV_GROUPS,
  SA_VALID_FEATURE_KEYS,
  navItemToPath,
} from './nav.constant'
export type { NavGroup, NavSubItem } from './nav.constant'

export {
  NAV_CLS,
  TYPOGRAPHY,
  SCROLL_CLS,
  BADGE_KATEGORI,
  BADGE_CHANNEL,
  resolveKategoriColor,
  resolveChannelColor,
} from './ui-tokens.constant'

export {
  resolvePageMeta,
} from './page-meta.constant'
export type { PageMeta } from './page-meta.constant'
