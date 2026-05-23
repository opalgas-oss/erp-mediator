# ARSIP SESI #206 — fix sendOTP() tidak cek attempts counter
# Dibuat: 23 Mei 2026

## Bug yang ditemukan dari test Philips Image 4

User refresh halaman setelah MAX_ATTEMPTS → login ulang → server kirim OTP baru padahal
counter `otp_attempts` di Redis masih ≥ max. User masuk OTP stage lagi (state lokal
hilang, otpPercobaan reset ke 0 di client).

## Root cause

`lib/services/otp.service.ts` fungsi `sendOTP()` hanya mengecek `otp_resend` counter
sebelum kirim OTP — TIDAK mengecek `otp_attempts` counter.

User yang sudah MAX_ATTEMPTS bisa request OTP baru asalkan resend belum max.

## File yang diubah

1. `lib/services/otp.service.ts` — tambah cek otp_attempts di sendOTP() + tambah errorCode field di SendOTPResult
2. `app/api/auth/send-otp/route.ts` — pass-through errorCode ke client response
3. `lib/hooks/useLoginFlow.ts` — handle errorCode='MAX_ATTEMPTS' → setTahap('KREDENSIAL')

## Versi sebelumnya

Untuk versi otp.service.ts sebelumnya, lihat:
- _arsip/coding-history/sesi-206-revert-spec-bug017-018/lib/services/otp.service.ts (REVERT spec)
- _arsip/coding-history/sesi-206-fix-expired-counter-gap/ (CATATAN_ARSIP.md)
