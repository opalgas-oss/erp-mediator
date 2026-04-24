// lib/constants/otp-type.constant.ts
// Konstanta tipe OTP — dipakai di session.ts dan login flow
//
// Nilai ini sesuai dengan kolom `type` di tabel `otp_codes`
//
// Dibuat: Sesi #049 — Step 6 ANALISIS v3

export const OTP_TYPE = {
  LOGIN:          'LOGIN',
  RESET_PASSWORD: 'RESET_PASSWORD',
  VERIFY_EMAIL:   'VERIFY_EMAIL',
} as const

/** Tipe union dari semua tipe OTP yang valid */
export type OTPTypeValue = typeof OTP_TYPE[keyof typeof OTP_TYPE]
