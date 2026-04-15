# ERP Mediator Hyperlocal — Konteks Project untuk Claude Code
# Sprint 1 — Login & Auth Lengkap
# Terakhir diupdate: 14 April 2026 — Sesi #025

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

## TOOLS YANG DIGUNAKAN

- Claude Desktop + MCP Filesystem: baca/tulis file langsung ke folder project (AKTIF)
- Terminal Claude Code: eksekusi coding — buat file, edit kode, jalankan perintah
- v0.app: TIDAK DIGUNAKAN sejak Sesi #022 — semua UI dikerjakan via Claude + MCP

Port lokal: localhost:3000 (satu port saja, tidak boleh ganti)

---

## PROTOKOL PENULISAN DOKUMEN — WAJIB (Ditetapkan Sesi #024)

BERLAKU untuk semua file dokumen tanpa kecuali:
1. Baca versi lama via MCP dulu — WAJIB sebelum tulis versi baru
2. Konten lama yang tidak berubah → copy paste UTUH + beri keterangan "(dari Sesi #XXX / vX)"
3. Konten lama yang sudah disepakati salah/tidak diperlukan → hapus bagian itu saja
4. Konten baru dari chat → tambahkan di bagian yang relevan
5. TIDAK ADA kata "ringkasan" — semua konten ditulis UTUH dan LENGKAP
6. File dokumen = sumber kebenaran — JANGAN simpan info penting hanya di memori
7. JANGAN tulis berdasarkan asumsi atau ingatan — HARAM

---

## WORKFLOW WAJIB — IKUTI SEBELUM EKSEKUSI APAPUN

WAJIB diikuti untuk setiap perubahan kode, penambahan fitur, atau perbaikan bug:

1. BACA file terkait via MCP dulu — jangan berasumsi kondisi kode
2. LAPOR rencana lengkap:
   - Tahapan kerja yang akan dilakukan
   - File yang akan diubah + bagian/fungsi mana + alasan
   - Dampak ke file lain
3. TUNGGU konfirmasi Philips — SETUJU / REVISI / TOLAK
4. EKSEKUSI hanya yang disetujui — SATU TAHAP, SATU KONFIRMASI
5. TEST bersama Philips — catat hasil LULUS / GAGAL
6. UPDATE dokumen setelah kode terbukti berjalan
7. BUAT Manual Guide DOCX — panduan verifikasi untuk Philips

---

## SPRINT AKTIF

- Sprint: Sprint 1 — Login & Auth Lengkap
- Step selesai: A, B, C, D, E.1, E.2, E.3, E.4.1, E.4.2
- Yang sedang dikerjakan: E.4.3 — Implementasi UI/UX Modul Konfigurasi
- Referensi UI: UI_UX_Approved\dashboard_config_login_sesi025_v1.html
- Testing: 10/36 TC lulus — 26 TC pending
- Referensi: WORKFLOW_SYSTEM_LOGIN_v4.md + TEST_CASES_LOGIN.md

---

## FILE LIB YANG SUDAH ADA

- lib/firebase.ts — koneksi Firebase (client-side)
- lib/auth.ts — RBAC, session cookies, role mapping (setSessionCookies, ROLE_DASHBOARD)
- lib/auth-server.ts — verifyJWT() server-side via Firebase Admin — HANYA untuk Server Component & API Route
- lib/getTenantConfig.ts — baca config tenant dari Firestore
- lib/config-registry.ts — getConfigValue(), getConfigItem(), getAllConfigsByCategory()
- lib/policy.ts — getEffectivePolicy() — merge policy 2 level
- lib/activity.ts — updateUserPresence() + writeActivityLog()
- lib/cache.ts — abstraksi layer cache (TTL + LRU + stampede prevention)
- lib/session.ts — GPS, OTP, Biometric, session log
- lib/account-lock.ts — getAccountLock(), setAccountLock() — cek & kelola kunci akun
- lib/pilihan-opsi.ts — 17 grup Pilihan Opsi untuk dropdown dinamis

---

## FILE PENTING YANG SUDAH ADA

- app/login/page.tsx — halaman login multi-tahap (GPS → Kredensial → OTP → Biometric)
- app/register/page.tsx — halaman register Customer + Vendor
- app/setup/page.tsx — halaman buat akun SuperAdmin pertama (first-time setup)
- app/dashboard/superadmin/layout.tsx — layout sidebar SuperAdmin + proteksi verifyJWT
- app/dashboard/superadmin/page.tsx — halaman utama Dashboard SuperAdmin
- app/dashboard/superadmin/settings/config/page.tsx — halaman konfigurasi login SuperAdmin
- app/api/setup/check/route.ts — cek apakah setup sudah selesai
- app/api/setup/create-superadmin/route.ts — buat akun SuperAdmin (dipanggil sekali)
- app/api/config/[feature_key]/route.ts — GET + PATCH config item
- app/api/auth/check-lock/route.ts — cek apakah akun terkunci sebelum login
- app/api/auth/lock-account/route.ts — catat login gagal + kunci akun jika melebihi batas
- app/api/auth/unlock-account/route.ts — buka kunci akun (auto setelah login berhasil)
- app/api/auth/check-session/route.ts — cek sesi paralel (concurrent session)
- components/ConfigItem.tsx — komponen item konfigurasi reusable
- components/config/ConfigRenderer.tsx — renderer config generik (dibuat E.4)
- scripts/seed-tenant.mjs — seed data awal: security_login policy + message_library
- middleware.ts — proteksi route /dashboard, baca cookie 'session', routing per role

---

## ATURAN PENTING COOKIE SESSION

- Cookie 'session' berisi Firebase ID Token (JWT)
- Middleware membaca cookie 'session' untuk routing
- verifyJWT() di Server Component membaca cookie 'session' dan verifikasi via Admin SDK
- SUPERADMIN: login page set cookie 'session' = Firebase ID Token langsung
- Non-SUPERADMIN: selesaiLogin() memanggil setSessionCookies() — BELUM set cookie 'session'
  → Akan diperbaiki di Sprint 2 (non-SUPERADMIN dashboard belum dibuat)
- JANGAN set cookie 'session_role' atau 'session_tenant' untuk SUPERADMIN

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
- /platform_config/settings — is_setup_complete flag
- /users/{uid} — data SUPERADMIN (root level, BUKAN di /tenants/)
- /tenants/{tenantId}/config/main — tenant-level config + policy override
- /tenants/{tenantId}/users/{uid} — data user per tenant (Customer, Vendor, AdminTenant)
- /tenants/{tenantId}/vendor_registrations/{vendorId} — pendaftaran vendor
- /tenants/{tenantId}/account_locks/{uid} — kunci akun throttling
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
