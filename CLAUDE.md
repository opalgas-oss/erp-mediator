# ERP Mediator Hyperlocal — Konteks Project untuk Claude Code
# Sprint 1 — Login & Auth Lengkap
# Terakhir diupdate: 6 April 2026 — Sesi #007

---

## IDENTITAS PROJECT

- Nama: Platform Marketplace Jasa Reverse Auction (Multi-Tenant, Multi-Brand)
- Stack: Next.js 14, Firestore, Firebase Auth, shadcn/ui, Vercel
- WA API: Fonnte — device: 628164851879 — token di .env.local (FONNTE_API_KEY)
- Payment: Xendit — key di .env.local
- Storage Media: Cloudinary — key di .env.local
- Folder: D:\Philips\Project\erp-mediator
- GitHub: https://github.com/opalgas-oss/erp-mediator
- Firebase Project ID: erp-mediator
- Tenant ID Aktif: tenant_erpmediator

---

## SPRINT AKTIF

- Sprint: Sprint 1 — Login & Auth Lengkap
- Yang sedang dikerjakan: Belum mulai — butuh dokumen dulu sebelum coding

---

## FILE LIB YANG SUDAH ADA

- lib/firebase.ts — koneksi Firebase (client-side)
- lib/auth.ts — RBAC, session cookies, role mapping
- lib/getTenantConfig.ts — baca config tenant dari Firestore
- lib/config-registry.ts — getConfigValue(), getConfigItem(), getAllConfigsByCategory()
- lib/policy.ts — getEffectivePolicy() — merge policy 2 level
- lib/activity.ts — updateUserPresence() + writeActivityLog()
- lib/cache.ts — abstraksi layer cache (TTL + LRU + stampede prevention)
- lib/session.ts — GPS, OTP, Biometric, session log

---

## ATURAN CODING WAJIB — TIDAK BOLEH DILANGGAR

### Aturan Arsitektur
1. SEMUA nilai konfigurasi bisnis WAJIB baca via getEffectivePolicy() — TIDAK BOLEH hardcode
2. SETIAP halaman WAJIB panggil updateUserPresence() dan writeActivityLog() dari lib/activity.ts
3. SETIAP API route WAJIB validasi input dengan Zod
4. SEMUA kalkulasi uang HANYA di server — tidak ada di browser
5. SETIAP dokumen Firestore WAJIB ada tenant_id
6. SEMUA teks UI dalam Bahasa Indonesia
7. Komentar kode dalam Bahasa Indonesia
8. Sebelum buat file baru — cek apakah fungsinya sudah ada di lib/

### Aturan Performa
9. DILARANG query di dalam loop — wajib pakai batch write atau Promise.all
10. SEMUA list data WAJIB pakai limit/pagination — tidak boleh ambil semua dokumen sekaligus
11. SELALU pakai named import — tidak boleh import * dari library manapun
12. Komponen besar atau jarang dipakai WAJIB pakai dynamic import
13. SETIAP event listener WAJIB ada cleanup saat logout dan saat tab/browser ditutup
14. Pekerjaan berat (blast WA, disbursement) WAJIB pakai Queue — tidak boleh diproses langsung di API route

### Aturan Proses
15. Setelah selesai setiap file — kabari nama file yang dibuat dan cara testingnya
16. Kerjakan SATU FILE dalam SATU instruksi — tidak boleh gabung beberapa file sekaligus

### Catatan Penting Firestore
17. Path policies Firestore WAJIB 4 segmen: doc(db, 'platform_config', 'policies', featureKey, 'config') — JANGAN gunakan 3 segmen — Firestore menolak
18. Seed script pakai firebase-admin — scripts/serviceAccountKey.json wajib ada

---

## PATH FIRESTORE PENTING

- /platform_config/policies/{featureKey} — platform-level policy
- /platform_config/config_registry/{configId} — Dynamic Config Registry
- /tenants/{tenantId}/config/main — tenant-level config + policy override
- /tenants/{tenantId}/users/{uid} — data user per tenant
- /tenants/{tenantId}/user_presence/{uid} — realtime presence (OVERWRITE)
- /tenants/{tenantId}/activity_logs/{logId} — audit log (APPEND-ONLY)
- /tenants/{tenantId}/session_logs/{sessionId} — session tracking
- /tenants/{tenantId}/otp_codes/{uid} — OTP sementara
- /tenants/{tenantId}/trusted_devices/{deviceId} — device biometric
- /tenants/{tenantId}/wa_queue/{jobId} — antrian WA blast (Sprint 6)
- /tenants/{tenantId}/disbursement_queue/{jobId} — antrian pembayaran vendor (Sprint 5)

---

## ARSITEKTUR POLICY — 2 LEVEL

Level 1 (Platform Owner):
  /platform_config/policies/{featureKey}
  → nilai default + aturan override (tenant_can_override per field)

Level 2 (Tenant Admin):
  /tenants/{tenantId}/config/main → policies.{featureKey}
  → hanya field yang tenant_can_override = true yang bisa diisi

Fungsi merge: getEffectivePolicy(tenantId, featureKey)
→ kalau tenant override ada dan diizinkan → pakai nilai tenant
→ kalau tidak → pakai nilai platform

---

## FEATURE KEYS YANG ADA

- security_login — keamanan login (max attempts, OTP, biometric, session timeout)
- concurrent_session — aturan sesi paralel
- commission — persentase komisi dan siapa yang bayar
- timers — durasi timer T1, T2, T3 untuk auction
- activity_logging — apa yang dicatat dan berapa lama disimpan

---

## TIGA SISTEM REALTIME

Sistem 1 — Config Changes:
  onSnapshot /tenants/{tenantId}/config/main
  → kalau token_version berubah → force JWT refresh → update React context

Sistem 2 — User Presence:
  onSnapshot /tenants/{tenantId}/user_presence/{uid}
  → kalau status = "terminated" → force logout

Sistem 3 — Notifikasi:
  onSnapshot /tenants/{tenantId}/notifications/{uid}
  → tampilkan toast notifikasi

Semua 3 listener dipasang saat login berhasil.
Semua 3 listener WAJIB dihentikan saat logout DAN saat tab/browser ditutup.

---

## STANDAR CACHE (lib/cache.ts)

lib/cache.ts WAJIB mengimplementasikan:
- TTL per item: setiap item cache punya waktu kadaluarsa
- LRU Eviction: saat cache penuh, hapus item paling lama tidak diakses
- Stampede Prevention: saat cache expired, hanya 1 request yang fetch ke DB
- Max cache size: batasi jumlah item — tidak boleh cache tanpa batas
