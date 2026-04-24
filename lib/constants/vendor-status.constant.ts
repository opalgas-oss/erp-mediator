// lib/constants/vendor-status.constant.ts
// Konstanta status vendor — dipakai di login flow, dashboard, dan seed scripts
//
// Nilai ini sesuai dengan kolom `status` di tabel `user_profiles` untuk role VENDOR
// PENDING  = baru daftar, belum direview
// REVIEW   = sedang direview oleh SuperAdmin
// APPROVED = sudah disetujui, boleh login ke dashboard vendor
//
// Dibuat: Sesi #049 — Step 6 ANALISIS v3

export const VENDOR_STATUS = {
  PENDING:  'PENDING',
  REVIEW:   'REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUSPENDED:'SUSPENDED',
} as const

/** Tipe union dari semua status vendor yang valid */
export type VendorStatusType = typeof VENDOR_STATUS[keyof typeof VENDOR_STATUS]

/** Status yang diizinkan masuk ke dashboard vendor */
export const VENDOR_LOGIN_ALLOWED: VendorStatusType[] = [
  VENDOR_STATUS.APPROVED,
]
