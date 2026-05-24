// lib/types/user-profile.types.ts
// Tipe data untuk user_profiles — status registrasi dan lifecycle
// Dibuat: Sesi #212 — STATUS-REDESIGN
//
// Sebelumnya user_profiles.status (PENDING/REVIEW/APPROVED uppercase) tidak punya type tersendiri.
// Setelah STATUS-REDESIGN S#212: dua kolom terpisah dengan type yang jelas.
//
// Dipakai oleh:
//   - app/api/auth/load-user-profile/route.ts (response object)
//   - lib/hooks/useLoginFlow.ts (cek vendor register_status)
//   - lib/utils/otp-only.server.ts (filter by register_status)

// ─── Register Status (proses seleksi/onboarding) ─────────────────────────────

/**
 * Status registrasi user — menentukan apakah user BOLEH beroperasi di platform.
 *
 * pending  — register sudah dilakukan, belum dibuka/diproses admin
 * review   — admin sudah membuka, sedang ditinjau, belum ada keputusan
 * approved — diterima, sistem kirim link aktivasi (AdminTenant/Vendor bisa login)
 * rejected — ditolak, alasan tersimpan di DB
 */
export type UserRegisterStatus =
  | 'pending'
  | 'review'
  | 'approved'
  | 'rejected'

// ─── Lifecycle Status (kondisi operasional setelah approved) ─────────────────

/**
 * Status operasional user setelah register diapprove.
 *
 * NULL     — belum approved, belum ada lifecycle
 * pending  — link aktivasi dikirim, belum diklik user
 * active   — sudah klik link aktivasi, akun beroperasi penuh
 * suspended — penangguhan sementara (pelanggaran)
 * expired  — kontrak habis / tidak perpanjang
 * terminated — diputus paksa, permanen
 */
export type UserLifecycleStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'terminated'

// ─── Response: load-user-profile API ─────────────────────────────────────────

/**
 * Shape response dari /api/auth/load-user-profile
 * Dipakai oleh fetchLoadUserProfile() di loginApiCalls.ts
 * Update S#212: register_status menggantikan status (yang lama uppercase)
 */
export interface LoadUserProfileResponse {
  success:          boolean
  nama?:            string
  nomor_wa?:        string
  role?:            string
  register_status?: UserRegisterStatus | ''   // S#212: was 'status'
  error?:           string
}
