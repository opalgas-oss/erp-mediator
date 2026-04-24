// lib/constants/session-status.constant.ts
// Konstanta status session/presence user
//
// Nilai ini sesuai dengan kolom `status` di tabel `user_presence`
//
// Dibuat: Sesi #049 — Step 6 ANALISIS v3

export const SESSION_STATUS = {
  ONLINE:  'online',
  OFFLINE: 'offline',
} as const

/** Tipe union dari status session */
export type SessionStatusType = typeof SESSION_STATUS[keyof typeof SESSION_STATUS]
