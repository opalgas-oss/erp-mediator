# ERP Mediator Hyperlocal — Konteks Project untuk Claude Code
# Sprint 1 — Login & Auth Lengkap (FASE M Aktif)
# Terakhir diupdate: 17 April 2026 — Sesi #032
# Perubahan dari versi sebelumnya:
#   - IDENTITAS PROJECT: Stack diupdate — Firebase/Firestore → Supabase/PostgreSQL
#   - SPRINT AKTIF: FASE M sebagai prioritas berikutnya (Sesi #033)
#   - FILE LIB: Diupdate total — hapus Firebase, tambah Supabase + Repository/Service/Adapter
#   - FILE PENTING: Diupdate — hapus firestore.rules, tambah file Supabase
#   - ATURAN COOKIE SESSION: Firebase JWT → Supabase JWT
#   - ATURAN CODING: Tambah aturan Supabase + API Layer + Database Standards
#   - PATH DATABASE: Firestore paths → PostgreSQL tables
#   - TIGA SISTEM REALTIME: onSnapshot → Supabase Realtime
#   - STANDAR CACHE: Diupdate — unstable_cache + react.cache() + Upstash Redis

---

## IDENTITAS PROJECT
(Update Sesi #032 — PIVOT ARSITEKTUR Firebase/Firestore → Supabase/PostgreSQL)

- Nama: Platform Marketplace Jasa Reverse Auction (Multi-Tenant, Multi-Brand)
- Stack: **Next.js 16.2.1**, React 19.2.4, **PostgreSQL via Supabase**, **Supabase Auth**, **Drizzle ORM + postgres.js**, **Upstash Redis**, shadcn/ui, Tailwind CSS 4, Vercel
- WA API: Fonnte — credential disimpan di database terenkripsi (bukan di .env)
- Payment: Xendit — credential disimpan di database terenkripsi (bukan di .env)
- Storage Media: Cloudinary — credential disimpan di database terenkripsi (bukan di .env)
- Search: Typesense self-hosted VPS — credential disimpan di database terenkripsi (bukan di .env)
- Folder: D:\Philips\Project\erp-mediator
- GitHub: https://github.com/opalgas-oss/erp-mediator
- Supabase Project DEV: erp-mediator-dev (region ap-southeast-1 Singapore)
- Tenant ID Aktif: tenant_erpmediator

**CATATAN PENTING:** Stack adalah Next.js 16.2.1 + React 19 + Supabase/PostgreSQL.
Firebase dan Firestore sudah TIDAK DIGUNAKAN sejak Sesi #032 (FASE M).
Semua credential service disimpan terenkripsi di database — TIDAK ada di .env kecuali 4 bootstrap secret.

---

## TOOLS YANG DIGUNAKAN
(dari Sesi #025 — tidak berubah)

- Claude Desktop + MCP Filesystem: baca/tulis file langsung ke folder project (AKTIF)
- Terminal Claude Code: eksekusi coding — buat file, edit kode, jalankan perintah
- v0.app: TIDAK DIGUNAKAN sejak Sesi #022 — semua UI dikerjakan via Claude + MCP

Port lokal: localhost:3000 (satu port saja, tidak boleh ganti)

---

## PROTOKOL PENULISAN DOKUMEN — WAJIB (Ditetapkan Sesi #024)
(dari Sesi #024 — tidak berubah)

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
(dari Sesi #025 — tidak berubah)

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
(Update Sesi #032 — FASE M sebagai prioritas pertama Sesi #033)

- Sprint: Sprint 1 — Login & Auth Lengkap
- Step selesai: A, B, C, D, E.1, E.2, E.3, E.4.1, E.4.2, TAHAP 0, **TAHAP 1 ✅ SELESAI DI STAGING (Sesi #031)**
- **Yang dikerjakan berikutnya: FASE M — Migrasi Firebase → Supabase (mulai Sesi #033)**
- TAHAP P0: Dikerjakan otomatis dalam FASE M (P0.1 di M.D, P0.4 di M.G)
- Referensi FASE M: MIGRATION_PLAN_FIREBASE_TO_SUPABASE_v1.md
- Referensi UI: UI_UX_Approved\dashboard_config_login_sesi025_v1.html
- Testing: 10/36 TC lulus — 26 TC pending

---

## ENVIRONMENT VARIABLES (4 BOOTSTRAP SECRET SAJA)

File: .env.development.local

```
MASTER_ENCRYPTION_KEY=[32 bytes base64]
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key dari Supabase Dashboard]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key dari Supabase Dashboard]
```

TIDAK ADA credential lain di .env (Xendit, Fonnte, Cloudinary, Redis, Typesense, SMTP, Cloudflare).
Semua credential service diisi via Dashboard SuperAdmin → menu Integrasi → disimpan terenkripsi di database.

---

## FILE LIB YANG SUDAH ADA / YANG AKAN ADA SETELAH FASE M
(Update Sesi #032 — GANTI TOTAL)

### Layer Foundation (dibuat di FASE M C)
- lib/supabase-server.ts — createServerSupabaseClient() service role — HANYA server-side
- lib/supabase-client.ts — createBrowserSupabaseClient() anon key — HANYA browser
- lib/db.ts — Drizzle ORM + postgres.js via Supavisor port 6543, prepare: false
- lib/credential-crypto.ts — enkripsiCredential() + dekripsiCredential() AES-256-GCM

### Layer Repository (dibuat di FASE M D)
- lib/repositories/auctions.repository.ts
- lib/repositories/bids.repository.ts
- lib/repositories/users.repository.ts
- lib/repositories/payments.repository.ts

### Layer Service (dibuat di FASE M D)
- lib/services/bid.service.ts — placeBid(), validateBid()
- lib/services/auction.service.ts — createAuction(), closeAuction()
- lib/services/payment.service.ts — createPayment(), processWebhook()
- lib/services/notification.service.ts — notifyOutbid(), notifyPayment()

### Layer Adapter (dibuat di FASE M D)
- lib/payments/types.ts — PaymentGateway interface
- lib/payments/xendit.adapter.ts — implements PaymentGateway
- lib/whatsapp/types.ts — WhatsAppProvider interface
- lib/whatsapp/fonnte.adapter.ts — implements WhatsAppProvider

### Layer Helper (dimigrasi dari Firebase di FASE M)
- lib/auth-server.ts — verifyJWT() dengan react.cache() — server-side only
- lib/auth.ts — RBAC, session cookies, role mapping
- lib/config-registry.ts — getConfigValue() via unstable_cache
- lib/policy.ts — getEffectivePolicy() via unstable_cache
- lib/activity.ts — updateUserPresence() + writeActivityLog()
- lib/cache.ts — MemoryCache + helper unstable_cache + react.cache()
- lib/session.ts — GPS, OTP, Biometric, session log
- lib/account-lock.ts — getAccountLock(), setAccountLock()
- lib/errors.ts — Hierarki AppError + 9 jenis error standar
- lib/api/handler.ts — withApi() wrapper untuk semua Route Handler
- lib/api/envelope.ts — successEnvelope(), errorEnvelope()

### Yang Diarsipkan di FASE M B.2 (bukan dihapus)
- lib/firebase.ts → _arsip/firebase-legacy/lib/
- lib/firebase-admin.ts → _arsip/firebase-legacy/lib/

---

## FILE PENTING YANG SUDAH ADA
(Update Sesi #032 — status diupdate sesuai FASE M)

- app/login/page.tsx — akan dimigrasi FASE M F.2
- app/register/page.tsx — belum menyentuh FASE M
- app/init-philipsliemena/page.tsx — akan dimigrasi FASE M F.6
- app/dashboard/superadmin/layout.tsx — akan dimigrasi FASE M F.3
- app/dashboard/superadmin/page.tsx — akan dimigrasi FASE M F.4
- app/dashboard/superadmin/settings/config/page.tsx — akan dimigrasi FASE M F.5
- app/dashboard/superadmin/settings/config/ConfigPageClient.tsx — TIDAK perlu dimigrasi
- app/dashboard/superadmin/settings/[...slug]/page.tsx — TIDAK perlu dimigrasi
- app/api/setup/check/route.ts — akan dimigrasi FASE M E.6
- app/api/setup/create-superadmin/route.ts — akan dimigrasi FASE M E.7
- app/api/config/[feature_key]/route.ts — akan dimigrasi FASE M E.5
- app/api/auth/check-lock/route.ts — akan dimigrasi FASE M E.1
- app/api/auth/lock-account/route.ts — akan dimigrasi FASE M E.2
- app/api/auth/unlock-account/route.ts — akan dimigrasi FASE M E.3
- app/api/auth/check-session/route.ts — akan dimigrasi FASE M E.4
- components/SidebarNav.tsx — TIDAK perlu dimigrasi
- components/ConfigItem.tsx — TIDAK perlu dimigrasi
- scripts/seed-tenant.mjs — akan DITULIS ULANG FASE M H.1
- middleware.ts — akan dimigrasi + full crypto verify FASE M F.1
- next.config.ts — akan ditambah HTTP Security Headers FASE M G.1
- firestore.rules — akan DIARSIPKAN FASE M B.2

---

## ATURAN PENTING COOKIE SESSION
(Update Sesi #032 — Firebase JWT → Supabase JWT setelah FASE M)

SEBELUM FASE M (kondisi sekarang):
- Cookie 'session' berisi Firebase ID Token (JWT)
- Middleware decode base64 untuk routing
- verifyJWT() verifikasi via Firebase Admin SDK

SETELAH FASE M (kondisi baru):
- Cookie 'session' berisi Supabase JWT
- Middleware verifikasi full crypto dengan Supabase JWT secret
- verifyJWT() verifikasi via Supabase Auth, dibungkus react.cache()
- Custom claims (app_role, tenant_id) diinjeksi via Custom Access Token Hook
- SUPERADMIN: login page set cookie 'session' = Supabase JWT

---

## ATURAN CODING WAJIB — TIDAK BOLEH DILANGGAR
(Update Sesi #032 — tambah aturan API Layer + Database Standards)

### Aturan Arsitektur
1. SEMUA nilai konfigurasi bisnis WAJIB baca via getEffectivePolicy() — TIDAK BOLEH hardcode
2. SETIAP halaman WAJIB panggil updateUserPresence() dan writeActivityLog() dari lib/activity.ts
3. SETIAP API route WAJIB validasi input dengan Zod
4. SEMUA kalkulasi uang HANYA di server — tidak ada di browser
5. SETIAP tabel PostgreSQL WAJIB ada tenant_id
6. SEMUA teks UI dalam Bahasa Indonesia
7. Komentar kode dalam Bahasa Indonesia
8. Sebelum buat file baru — cek apakah fungsinya sudah ada di lib/

### Aturan API Layer (BARU Sesi #032)
9. Route Handler dan Server Action HANYA boleh panggil Service — TIDAK BOLEH query database langsung
10. SETIAP file di lib/repositories/ dan lib/services/ WAJIB diawali `import 'server-only'`
11. Ganti third-party provider = ganti Adapter saja — Service TIDAK BOLEH diubah
12. Credential service WAJIB disimpan via lib/credential-crypto.ts — TIDAK BOLEH di kode atau .env biasa

### Aturan Performa
13. DILARANG query di dalam loop — wajib pakai batch insert atau Promise.all
14. SEMUA list data WAJIB pakai limit/pagination — tidak boleh ambil semua row sekaligus
15. SELALU pakai named import — tidak boleh import * dari library manapun
16. Komponen besar atau jarang dipakai WAJIB pakai dynamic import
17. SETIAP event listener WAJIB ada cleanup saat logout dan saat tab/browser ditutup
18. Pekerjaan berat (blast WA, disbursement) WAJIB pakai Queue (Inngest/PGMQ) — tidak boleh di API route langsung

### Aturan Supabase + Next.js 16 (BARU Sesi #032)
19. WAJIB bungkus verifyJWT() dengan react.cache() — mencegah cold start berulang per navigasi
20. WAJIB pakai Supabase service role client di semua file lib/ yang jalan di server
21. WAJIB pakai unstable_cache untuk data policy dan config yang shared across requests
22. WAJIB koneksi database via Supavisor port 6543 + `prepare: false` di Vercel runtime
23. Migration WAJIB via Drizzle Kit + Supabase CLI — TIDAK BOLEH langsung edit SQL Editor production
24. Operasi kritikal (bid, close auction, payment) WAJIB dalam PostgreSQL RPC Function + SELECT FOR UPDATE

### Aturan Database Security (dari standar Philips)
25. Data PII sensitif (NIK, NPWP, rekening) WAJIB dienkripsi AES-256-GCM sebelum masuk database
26. Semua tabel WAJIB punya Row Level Security (RLS) policy
27. Tabel yang tumbuh cepat (bids, activity_logs) WAJIB dipartisi dari hari pertama
28. Semua tabel kritikal WAJIB punya immutable audit trigger

### Aturan Proses
29. Setelah selesai setiap file — kabari nama file yang dibuat dan cara testingnya
30. Kerjakan SATU FILE dalam SATU instruksi — tidak boleh gabung beberapa file sekaligus

---

## PATH DATABASE POSTGRESQL
(Update Sesi #032 — GANTI TOTAL dari Firestore paths ke PostgreSQL tables)

Tabel utama:
- users — SuperAdmin (root level)
- tenants — daftar tenant/brand
- user_profiles — semua user kecuali SuperAdmin
- platform_policies — policy platform (JSONB nilai per feature_key)
- config_registry — Dynamic Config Registry
- account_locks — throttling login + progressive lockout
- session_logs — riwayat login PERMANEN
- otp_codes — kode OTP sementara
- trusted_devices — perangkat biometric
- user_presence — posisi user sekarang (UPSERT)
- activity_logs — log aktivitas PERMANEN partisi bulanan
- service_providers, provider_field_definitions, provider_instances, instance_credentials — tabel credential

Schema audit (terpisah):
- audit.log — perubahan data PERMANEN dengan hash chain
- audit.ddl_log — perubahan struktur database

---

## ARSITEKTUR POLICY — 2 LEVEL
(Update Sesi #032 — path diupdate ke PostgreSQL)

Level 1 (Platform Owner):
  Tabel: platform_policies WHERE feature_key = '[featureKey]'
  → nilai default + aturan override (tenant_can_override per field di JSONB)

Level 2 (Tenant Admin):
  Tabel: config_registry WHERE tenant_id = '[tenantId]' AND feature_key = '[featureKey]'
  → hanya field yang tenant_can_override = true yang bisa diisi

Fungsi merge: getEffectivePolicy(tenantId, featureKey)

---

## FEATURE KEYS YANG ADA
(dari Sesi #025 — tidak berubah)

- security_login — keamanan login (max attempts, OTP, biometric, session timeout)
- concurrent_session — aturan sesi paralel
- commission — persentase komisi dan siapa yang bayar
- timers — durasi timer T1, T2, T3 untuk auction
- activity_logging — apa yang dicatat dan berapa lama disimpan

---

## TIGA SISTEM REALTIME
(Update Sesi #032 — Supabase Realtime menggantikan Firestore onSnapshot)

Sistem 1 — Config Changes:
  Supabase Realtime subscribe tabel `platform_policies`
  → token_version berubah → request JWT refresh → update React context

Sistem 2 — User Presence:
  Supabase Realtime subscribe tabel `user_presence`
  → status = "terminated" → force logout

Sistem 3 — Notifikasi:
  Supabase Realtime subscribe tabel `notifications`
  → INSERT baru → tampilkan toast notifikasi

Semua 3 listener dipasang saat login berhasil.
Semua 3 listener WAJIB dihentikan saat logout DAN saat tab/browser ditutup.

---

## STANDAR CACHE
(Update Sesi #032 — tiga lapis cache untuk Vercel serverless + Supabase)

1. react.cache() — per-request deduplication
   → Untuk: verifyJWT(), session check
   → Scope: satu HTTP request, tidak shared antar user

2. unstable_cache (next/cache) — cross-request shared cache
   → Untuk: policy platform, config registry
   → TTL: 15 menit, invalidasi via revalidateTag()

3. Upstash Redis — edge + server persistent cache
   → Untuk: session data, rate limiting, bid state aktif
   → HTTP REST API — bisa dari Edge Runtime (middleware.ts)

lib/cache.ts (MemoryCache) masih ada sebagai fallback lokal untuk development.
Di production Vercel, WAJIB pakai react.cache() atau unstable_cache — bukan MemoryCache.
