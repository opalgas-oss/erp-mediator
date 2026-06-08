// lib/constants/vendor-status.constant.ts
// Konstanta status vendor — dipakai di login flow, dashboard, dan seed scripts
//
// Nilai ini sesuai dengan kolom `register_status` di tabel `user_profiles` untuk role VENDOR
// (kolom `status` sudah di-DROP S#212 — jangan gunakan lagi)
// pending  = baru daftar, belum direview
// review   = sedang direview oleh SuperAdmin
// approved = sudah disetujui, boleh login ke dashboard vendor
//
// Dibuat: Sesi #049 — Step 6 ANALISIS v3
// Update: 8 Juni 2026 CASE SESI-12 — nilai diubah ke lowercase (ATURAN 41)
//   kolom acuan diubah: status (DEPRECATED) → register_status (AKTIF)

export const VENDOR_STATUS = {
  PENDING:  'pending',
  REVIEW:   'review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED:'suspended',
} as const

/** Tipe union dari semua status vendor yang valid */
export type VendorStatusType = typeof VENDOR_STATUS[keyof typeof VENDOR_STATUS]

/** Status yang diizinkan masuk ke dashboard vendor */
export const VENDOR_LOGIN_ALLOWED: VendorStatusType[] = [
  VENDOR_STATUS.APPROVED,
]
