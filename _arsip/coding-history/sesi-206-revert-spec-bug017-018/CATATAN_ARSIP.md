# ARSIP SESI #206 — REVERT spec violation BUG-017 + BUG-018
# Dibuat: 23 Mei 2026
# Commit arsip: f06a15f

## File yang diarsip

### 1. lib/services/otp.service.ts
Path arsip: sesi-206-revert-spec-bug017-018/lib/services/otp.service.ts
Kondisi: MENGANDUNG spec violation:
  - Deklarasi `const attemptsRedisKey = makeOTPAttemptsRedisKey(...)` di sendOTP()
  - `await redisForCheck.del(attemptsRedisKey)` di post-send block
  - Komentar palsu: "BUG-018: delete attempt counter — OTP baru = attempt window baru"
File arsip penuh: tersedia di path di atas

### 2. lib/hooks/useLoginFlow.ts
Path arsip: sesi-206-revert-spec-bug017-018/lib/hooks/useLoginFlow.ts
Kondisi: MENGANDUNG spec violation:
  - `setOtpPercobaan(0)` di kirimOTP() baris: setOtpInput(''); setOtpPercobaan(0); setTahap('OTP')
  - Komentar palsu: "FIX S#205 — BUG-017: setOtpPercobaan(0) DIPERTAHANKAN intentional"
  - Komentar palsu: "Total security boundary: max_otp_resend (3) × max_otp_attempts (3) = 9 total attempts"
File arsip: dicatat di sini karena ukuran sangat besar (~400 baris)
Lokasi spec violation di fungsi kirimOTP() — sekitar baris:
  setOtpInput(''); setOtpPercobaan(0); setTahap('OTP')

## Perubahan yang dilakukan S#206 (REVERT)

### otp.service.ts:
HAPUS: const attemptsRedisKey = makeOTPAttemptsRedisKey(params.uid, params.tenantId)
HAPUS: await redisForCheck.del(attemptsRedisKey)
UPDATE: komentar post-send block (hapus referensi BUG-018 del)

### useLoginFlow.ts:
HAPUS: setOtpPercobaan(0) dari baris: setOtpInput(''); setOtpPercobaan(0); setTahap('OTP')
HAPUS: komentar spec violation di atas baris tersebut
UPDATE: komentar baru sesuai Opsi A keputusan Philips S#206
