// lib/constants/index.ts
// Barrel export — semua konstanta diakses dari sini
//
// Contoh penggunaan:
//   import { ROLES, VENDOR_STATUS, ACCOUNT_LOCK_STATUS } from '@/lib/constants'
//
// Dibuat: Sesi #049 — Step 6 ANALISIS v3

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
