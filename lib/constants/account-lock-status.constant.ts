// lib/constants/account-lock-status.constant.ts
// Konstanta status account lock — dipakai di account-lock.ts
//
// Nilai ini sesuai dengan kolom `status` di tabel `account_locks`
//
// Dibuat: Sesi #049 — Step 6 ANALISIS v3

export const ACCOUNT_LOCK_STATUS = {
  LOCKED:   'locked',
  UNLOCKED: 'unlocked',
} as const

/** Tipe union dari status account lock */
export type AccountLockStatusType = typeof ACCOUNT_LOCK_STATUS[keyof typeof ACCOUNT_LOCK_STATUS]

/** Metode unlock yang tersedia */
export const UNLOCK_METHOD = {
  AUTO:   'auto',
  MANUAL: 'manual',
} as const

/** Tipe union dari metode unlock */
export type UnlockMethodType = typeof UNLOCK_METHOD[keyof typeof UNLOCK_METHOD]
