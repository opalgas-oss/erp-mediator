# INDEX_INFRA_DAN_KEAMANAN.md
# Arsip Coding History — Infrastruktur bersama & keamanan — Redis, OTP, kunci akun
# Lokasi: _arsip/coding-history/INDEX_INFRA_DAN_KEAMANAN.md
# Induk navigasi: _arsip/coding-history/INDEX.md — JANGAN tulis entri di induk (ATURAN 36)
# Lahir: Sesi #427 — 31 Juli 2026, pemecahan INDEX.md 42.653 B (104,1% ambang 40.960 B) atas keputusan Philips K-427-1.
#   Sumbu pemecahan = KLASTER FITUR/MODUL, bukan urutan waktu. Alasan: pertanyaan kerja yang nyata
#   adalah "berkas yang mau saya sentuh ini pernah diarsip di mana?", dan waktu tidak menjawab itu.
#   Baris entri dipindah MEKANIS byte-exact dari salinan ber-checksum — nol karakter diketik ulang.
#
# DIKERJAKAN SETELAH: _arsip/coding-history/INDEX.md (induk navigasi)
# NEXT SETELAH INI:   folder snapshot yang disebut di baris entri
# BLOCKER:            Tidak ada

## GUNA FILE INI
Arsip berkas infrastruktur yang dipakai LINTAS fitur, plus perbaikan keamanan. Buka file ini sebelum menyentuh `lib/redis.ts` / `getRedisClient()`, generator OTP, atau berkas kunci akun. **Relevan untuk pembatas laju per-IP** (`HUTANG-RATELIMIT-ERROR-REPORT`) karena memakai `getRedisClient()` yang sama.

| Tanggal | Sesi | Keterangan |
|---|---|---|
| **11 Juli 2026** | **S#355** | **Snapshot `sesi-355-redis-envvar` dibuat. TEMUAN-1 (Redis): `lib/redis.ts` baca kredensial Upstash via getCredential (jalur DB berlapis). Terverifikasi Supabase: `provider_field_definitions.is_secret=false` untuk `rest_url` padahal nilai tersimpan terenkripsi -> getCredential kembalikan ciphertext mentah -> Redis dapat URL rusak (UrlError, log cron dpl_6zGT). Fix: getRedisClient() baca `process.env.UPSTASH_REDIS_REST_URL`/`TOKEN` langsung, lepas import ke credential-reader.ts (DEPRECATED S#052). Env var Upstash ditambahkan ke Vercel (URL+TOKEN, terverifikasi https asli). Substansi HUTANG-REDIS-SIMPLIFY. Arsip: 1 file (redis.ts). Hutang lanjutan: scope URL Preview->All Env sebelum merge; is_secret=false rest_url = hutang data.** |
| **13 Juli 2026** | **S#364** | **Snapshot `sesi-364-otp-csprng` dibuat. F-AUDIT security (temuan census auth/login Batch 3a): generator OTP LIVE `generateOTPCode()` (otp.service.ts, jalur /api/auth/send-otp) pakai `Math.floor(Math.random()*max)` — bukan CSPRNG, kode OTP berpotensi diprediksi. Fix: `import { randomInt } from 'crypto'` + `randomInt(0, max)` (uniform, tidak bias, kriptografis). Perilaku output tak berubah (N digit zero-pad). `session.ts.generateOTP` (Math.random) = fungsi MATI (login pakai server) -> disposisi hapus, bukan difix. Arsip: 1 file (otp.service.ts, byte-exact via move_file). Build PENDING verifikasi Philips.** |
| **13 Juli 2026** | **S#364** | **Snapshot `sesi-364-hapus-accountlock-deprecated` dibuat. F-AUDIT security temuan #2: `lib/account-lock.ts` (DEPRECATED S#052, superseded oleh account-lock.service.ts) me-`console.log` prefix+panjang token Fonnte (`apiKey.slice(0,8)`) — kebocoran kredensial ke log bila file dipanggil. Verifikasi caller: 3 route (check-lock/lock-account/unlock-account) semua import dari account-lock.service, bukan file ini; header file sanksikan hapus. Disposisi: HAPUS file (move ke arsip) — sekaligus tuntaskan hutang dead-code. Build = verifikasi caller final (import error bila ada importer tersembunyi -> restore). Arsip: 1 file (account-lock.ts, byte-exact via move_file). Build PENDING verifikasi Philips.** |
