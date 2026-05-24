CATATAN ARSIP — Sesi #207
File  : lib/services/otp.service.ts
Bug   : TTL resend counter salah — invensi S#205 tanpa dasar spec
Baris : await redisForCheck.expire(resendRedisKey, otpExpiryDetik * (maxResend + 1))
Nilai : 180 * 4 = 720 detik = 12 menit
Fix   : await redisForCheck.expire(resendRedisKey, otpExpiryDetik)
Nilai : 180 detik = 3 menit (sesuai Bug_Sesi_085.md TTL = session timeout = otp_expiry_seconds)

Referensi spec: Bug_Sesi_085.md BUG-019 Rencana Fix poin 2:
"Redis: tambah key otp_resend:{uid}:{tenantId} dengan TTL = session timeout"

File asli tidak di-copy utuh karena perubahan hanya 1 baris.
Snapshot full tersedia di git history sebelum commit ini.
