# ERP Mediator Hyperlocal — Konteks Project untuk Claude Code
# Sprint 1 — Login & Auth Lengkap
# Terakhir diupdate: 30 April 2026 — Sesi #077
#
# CATATAN: Reference ke dokumen lain TIDAK menyertakan nomor versi.
# Versi aktif setiap dokumen ada di DOCUMENT_REGISTRY (master list).
# Riwayat update CLAUDE.md: Sesi #032 (pivot Supabase), #044, #045, #052, #054 (audit), #077 (update menyeluruh).

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

## SUMBER KEBENARAN PER TOPIK
(BARU — Audit Dokumen 23 April 2026)

| Topik | File Sumber | Keterangan |
|---|---|---|
| Anti-hardcode | TECHNICAL_STANDARDS bab 8 | Prosedur, larangan, pengecualian |
| Identitas + Stack | ARSITEKTUR_FONDASI | Fondasi teknis platform |
| 3 Layer | API_AND_DATABASE_STANDARDS bab 2-3 | Route → Service → Repository |
| 3 Modul Dashboard | DASHBOARD_MODULES_SPEC | Config, Message, Credential |
| Config Schema | CONFIG_REGISTRY_CORE/INTEGRATION/UI_OPTIONS | Semua item konfigurasi |
| Credential Schema | CREDENTIAL_SYSTEM_SPEC | 4 tabel credential terenkripsi |
| Policy 2 Level | POLICY_INHERITANCE_SPEC | getEffectivePolicy() |
| Naming Convention | CODING_RULES_NAMING | Per layer, per file |
| SOP Coding | CODING_SOP_AI | 5 fase + checklist + BAB 4 Shared Logic |
| Coding Rules | CODING_RULES_AI | 17 aturan coding |
| Code Registry | CODE_REGISTRY_SPEC | DDL 7 tabel + query AI |
| Alur Login | WORKFLOW_LOGIN_ALUR_UTAMA | 8 tahap + aturan |
| OTP/Bio/Lock | WORKFLOW_LOGIN_FITUR_LANJUTAN | Detail 3 mode |
| Testing | CARA_KERJA_TESTING | 8 komitmen |
| Performa | PERFORMANCE_STANDARDS | Metrik + cache + data warm aktual |
| Bug Tracker | BUG_TRACKER | 13 bug, root cause, fix |
| Pelanggaran | CODING_SOP_LAMPIRAN | Pola kesalahan Sesi #053–#076 |
| File Lib | CLAUDE.md (INI) | Sumber kebenaran mapping lib/ |

---

## TOOLS YANG DIGUNAKAN
(dari Sesi #025 — tidak berubah)

- Claude Desktop + MCP Filesystem: baca/tulis file langsung ke folder project (AKTIF)
- Terminal Claude Code: eksekusi coding — buat file, edit kode, jalankan perintah
- v0.app: TIDAK DIGUNAKAN sejak Sesi #022 — semua UI dikerjakan via Claude + MCP

Port lokal: localhost:3000 (satu port saja, tidak boleh ganti)

**RESTART SERVER:** Jalankan `dev.ps1` (klik kanan → Run with PowerShell).
JANGAN instruksikan npm run dev manual atau PowerShell custom.

**STAGING URL PERMANEN:** `https://erp-mediator-git-dev-philips-liemenas-projects.vercel.app`
URL ini selalu mengikuti branch `dev`. Gunakan ini untuk semua testing online.
JANGAN gunakan deployment-specific URL (yang ada hash di tengahnya — berubah setiap build).

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
(Update Sesi #077 — 30 April 2026)

- Sprint: Sprint 1 — Login & Auth Lengkap
- FASE M: ✅ SELESAI PENUH
- Build: **31/31** ✅ (commit `c74593a` branch `dev` Sesi #075)
- BLOK aktif: **BLOK I — Test Menyeluruh**
- Branch: `dev` (aktif), `main` (production — belum merge)
- Vercel region: **sin1** (Singapore) — `vercel.json` di root project

**Status BLOK I:**
- I-01 BUILD 31/31 ✅
- I-02 Login SA ✅ warm 834ms
- I-03 Login Vendor ✅ warm 533ms
- I-04 Account lock ✅
- I-05 Concurrent session banner ⏳ menunggu TC-E02 + TC-E03
- I-06 Regresi check 🔴 BLOCKED menunggu I-05
- Merge dev→main ❌ BELUM

**Optimasi login yang sudah dikerjakan s/d Sesi #076:**
1. Keep-warm cron 3 lapis (cron-job.org + GitHub Actions + Cronping)
2. getClaims() middleware — ECC P-256 ~1ms fast path
3. JWT Custom Claims via Edge Function v5 (nama, vendor_status, nomor_wa)
4. loginUnifiedAction — 1 signInWithPassword untuk semua role
5. sendOTP Promise.all — 6 sequential → parallel
6. selesaiLogin() non-blocking — session-log + user-presence fire-and-forget
7. LOGIN_FORM_SCHEMA module-level + getConfigValues parallel
8. Region sin1 matching Supabase Singapore

**Referensi detail:** STATUS_PROJECT_SESI076, PERFORMANCE_STANDARDS, PROMPT_SESI_077

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

**Vercel:** 4 variable ini wajib ter-set untuk Production + Preview environment.
Cek di: Vercel → erp-mediator → Settings → Environment Variables.

---

## FILE LIB YANG SUDAH ADA / YANG AKAN ADA SETELAH FASE M
(Update Sesi #045 — tambah lib/redis.ts)

### Layer Foundation (dibuat di FASE M C)
- lib/supabase-server.ts — createServerSupabaseClient() service role — HANYA server-side
- lib/supabase-client.ts — createBrowserSupabaseClient() anon key — HANYA browser
- lib/db.ts — Drizzle ORM + postgres.js via Supavisor port 6543, prepare: false
- lib/credential-crypto.ts — enkripsiCredential() + dekripsiCredential() AES-256-GCM

### Layer Repository (dibuat di FASE M D + Sesi #051 BLOK B)
- lib/repositories/auctions.repository.ts
- lib/repositories/bids.repository.ts
- lib/repositories/users.repository.ts
- lib/repositories/payments.repository.ts
- **lib/repositories/account-lock.repository.ts** — BARU Sesi #051 — findByEmail, spIncrementLockCount, spUnlockAccount
- **lib/repositories/session-log.repository.ts** — BARU Sesi #051 — create, markLogout, findActiveByUid
- **lib/repositories/otp.repository.ts** — BARU Sesi #051 — upsert, spVerifyAndConsume
- **lib/repositories/user.repository.ts** — BARU Sesi #051 — findByEmail 3-tahap lookup
- **lib/repositories/user-presence.repository.ts** — BARU Sesi #051 — spUpsert, setOffline
- **lib/repositories/activity-log.repository.ts** — BARU Sesi #051 — create log
- **lib/repositories/credential.repository.ts** — BARU Sesi #051 — spGetCredential, getAllByProvider

### Layer Service (dibuat di FASE M D + Sesi #052 BLOK C)
- lib/services/bid.service.ts — placeBid(), validateBid()
- lib/services/auction.service.ts — createAuction(), closeAuction()
- lib/services/payment.service.ts — createPayment(), processWebhook()
- lib/services/notification.service.ts — notifyOutbid(), notifyPayment()
- **lib/services/account-lock.service.ts** — BARU Sesi #052 — getAccountLock, incrementLockCount, unlockAccount (object param), sendLockNotificationWA
- **lib/services/credential.service.ts** — BARU Sesi #052 — getCredential (SP+cache+env), getCredentialsByProvider, re-export enkripsi/dekripsi
- **lib/services/activity.service.ts** — BARU Sesi #052 — updateUserPresence (SP), setUserOffline, writeActivityLog (cek policy)
- **lib/services/otp.service.ts** — BARU Sesi #052 — sendOTP (generate+save+WA), verifyAndConsume (SP)
- **lib/services/session.service.ts** — BARU Sesi #052 — writeSessionLog, markLogout, findActiveSessions

### Layer Adapter (dibuat di FASE M D)
- lib/payments/types.ts — PaymentGateway interface
- lib/payments/xendit.adapter.ts — implements PaymentGateway
- lib/whatsapp/types.ts — WhatsAppProvider interface
- lib/whatsapp/fonnte.adapter.ts — implements WhatsAppProvider

### Layer Helper (dimigrasi dari Firebase di FASE M)
- lib/auth-server.ts — verifyJWT() dengan react.cache() — server-side only
- lib/auth.ts — RBAC, session cookies, role mapping
- lib/config-registry.ts — getConfigValue() + getPlatformTimezone() via unstable_cache
- lib/message-library.ts — getMessage() + getMessagesByKategori() via unstable_cache
- lib/credential-reader.ts — ⚠️ DEPRECATED Sesi #052 — digantikan CredentialService
- lib/credential-crypto.ts — enkripsi/dekripsi AES-256-GCM (masih aktif, re-exported oleh CredentialService)
- lib/policy.ts — getEffectivePolicy() via unstable_cache
- lib/activity.ts — ⚠️ DEPRECATED Sesi #052 — digantikan ActivityService (server-side)
- lib/cache.ts — MemoryCache + helper unstable_cache + react.cache()
- lib/session.ts — ⚠️ DEPRECATED Sesi #052 — dipecah ke session-client + services + useBiometric
- **lib/session-client.ts** — BARU Sesi #052 — getDeviceInfo, getGPSLocation, generateOTP (browser-only)
- lib/account-lock.ts — ⚠️ DEPRECATED Sesi #052 — digantikan AccountLockService
- lib/errors.ts — Hierarki AppError + 9 jenis error standar
- lib/api/handler.ts — withApi() wrapper untuk semua Route Handler
- lib/api/envelope.ts — successEnvelope(), errorEnvelope()
- **lib/redis.ts** — BARU Sesi #045 — getRedisClient() lazy init via getCredential() + env fallback. REDIS_TTL fallback constants. TTL sumber kebenaran dari config_registry (platform_general).

### Yang Diarsipkan di FASE M B.2 (bukan dihapus)
- lib/firebase.ts → _arsip/firebase-legacy/lib/
- lib/firebase-admin.ts → _arsip/firebase-legacy/lib/

---

## FILE PENTING YANG SUDAH ADA
(Update Sesi #045 — performance fix + redis)

- app/login/page.tsx ✅ — UPDATE Sesi #045: hapus getSessionTimeoutMinutes(), guard unlock-account with had_attempts, dedup config fetch (3→1)
- app/register/page.tsx — placeholder
- app/init-philipsliemena/page.tsx ✅ — setup SuperAdmin pertama
- app/dashboard/superadmin/layout.tsx ✅ — UPDATE Sesi #045: Promise.all 3 query paralel + unstable_cache TTL dari config_registry
- app/dashboard/superadmin/page.tsx ✅ — dashboard utama SuperAdmin
- **app/dashboard/superadmin/settings/security-login/page.tsx** ✅ — config page (RENAMED dari config/ — Sesi #044)
- **app/dashboard/superadmin/settings/security-login/ConfigPageClient.tsx** ✅ — form edit config
- app/dashboard/superadmin/settings/[...slug]/page.tsx ✅ — catch-all placeholder
- app/api/setup/check/route.ts ✅
- app/api/setup/create-superadmin/route.ts ✅
- app/api/config/[feature_key]/route.ts ✅ — UPDATE Sesi #045: Redis L1 cache-aside + invalidation + TTL dari config_registry
- app/api/auth/check-lock/route.ts ✅ — UPDATE Sesi #045: tambah had_attempts di semua response path
- app/api/auth/lock-account/route.ts ✅ — baca notify_superadmin_on_lock dari config_registry
- app/api/auth/unlock-account/route.ts ✅
- app/api/auth/check-session/route.ts ✅
- app/api/auth/send-otp/route.ts ✅
- app/api/message-library/route.ts ✅ — GET publik per kategori
- middleware.ts ✅ — full crypto verify Supabase JWT
- next.config.ts ✅ — HTTP Security Headers
- scripts/seed-tenant.mjs ✅ — 6 bagian seed
- scripts/seed-credentials.mjs ✅ — migrate .env → DB
- **scripts/add-redis-cache-ttl-config.sql** ✅ — BARU Sesi #045 — 4 key config_registry untuk Redis TTL + sidebar cache TTL. ⚠️ BELUM DIJALANKAN — jalankan via Supabase Dashboard atau Supabase MCP setelah restart Claude Desktop.
- **scripts/create-stored-procedures.sql** ✅ — BARU Sesi #051 — 5 SP: sp_increment_lock_count, sp_verify_and_consume_otp, sp_get_credential, sp_unlock_account, sp_upsert_user_presence. Semua SUDAH LIVE di DB.

## KOMPONEN YANG SUDAH ADA
(Update Sesi #044 — tidak berubah)

- **components/DashboardShell.tsx** ✅ BARU Sesi #044 — client wrapper mobile sidebar state
- **components/SidebarNav.tsx** ✅ REWRITE Sesi #044 — data-driven dari DB, NAV_POSITION constant, responsive
- **components/DashboardHeader.tsx** ✅ UPDATE Sesi #044 — messages prop, judul dinamis, hamburger
- components/ConfigItem.tsx ✅ — form item config (toggle, number, select)
- components/config/ ✅ — komponen UI config

---

## ATURAN AUTH & SESSION
(Update Sesi #077 — getClaims() + Edge Function v5)

- Auth: Supabase Auth (JWT + Custom Claims via Edge Function v5 HTTPS endpoint)
- Custom Claims di JWT: `app_role`, `tenant_id`, `nama`, `vendor_status`, `nomor_wa`
- Middleware: getClaims() fast path (ECC P-256, ~1ms) → getUser() fallback saja
- Login: `loginUnifiedAction` server action — 1 `signInWithPassword` untuk semua role
- selesaiLogin(): fire-and-forget (session-log + user-presence tidak blocking redirect)
- Session ID: generate di client via `crypto.randomUUID()`
- Concurrent session: `cekSesiParalel()` di layout RSC, banner amber dismissible
- Keep-warm: 3 lapis (cron-job.org + GitHub Actions backup + Cronping dead man's switch)

---

## ATURAN CODING WAJIB — TIDAK BOLEH DILANGGAR
(Update Sesi #032 — tambah aturan API Layer + Database Standards. Update Sesi #042–#045)

### Aturan Arsitektur
1. SEMUA nilai konfigurasi bisnis WAJIB baca via getConfigValues() — TIDAK BOLEH hardcode
2. SEMUA teks ke user WAJIB baca dari message_library via getMessage() atau m() helper
3. SEMUA credential service WAJIB baca via getCredential() dari credential-reader
4. SETIAP halaman WAJIB panggil updateUserPresence() dan writeActivityLog() dari lib/activity.ts
5. SETIAP API route WAJIB validasi input dengan Zod
6. SEMUA kalkulasi uang HANYA di server — tidak ada di browser
7. SETIAP tabel PostgreSQL WAJIB ada tenant_id
8. SEMUA teks UI dalam Bahasa Indonesia
9. Komentar kode dalam Bahasa Indonesia
10. Sebelum buat file baru — cek apakah fungsinya sudah ada di lib/

### Aturan API Layer (BARU Sesi #032)
11. Route Handler dan Server Action HANYA boleh panggil Service — TIDAK BOLEH query database langsung
12. SETIAP file di lib/repositories/ dan lib/services/ WAJIB diawali `import 'server-only'`
13. Ganti third-party provider = ganti Adapter saja — Service TIDAK BOLEH diubah
14. Credential service WAJIB disimpan via lib/credential-crypto.ts — TIDAK BOLEH di kode atau .env biasa

### Aturan Performa
15. DILARANG query di dalam loop — wajib pakai batch insert atau Promise.all
16. SEMUA list data WAJIB pakai limit/pagination — tidak boleh ambil semua row sekaligus
17. SELALU pakai named import — tidak boleh import * dari library manapun
18. Komponen besar atau jarang dipakai WAJIB pakai dynamic import
19. SETIAP event listener WAJIB ada cleanup saat logout dan saat tab/browser ditutup
20. Pekerjaan berat (blast WA, disbursement) WAJIB pakai Queue (Inngest/PGMQ) — tidak boleh di API route langsung

### Aturan Supabase + Next.js 16 (BARU Sesi #032)
21. WAJIB bungkus verifyJWT() dengan react.cache() — mencegah cold start berulang per navigasi
22. WAJIB pakai Supabase service role client di semua file lib/ yang jalan di server
23. WAJIB pakai unstable_cache untuk data policy dan config yang shared across requests
24. WAJIB koneksi database via Supavisor port 6543 + `prepare: false` di Vercel runtime
25. Migration WAJIB via Drizzle Kit + Supabase CLI — TIDAK BOLEH langsung edit SQL Editor production
26. Operasi kritikal (bid, close auction, payment) WAJIB dalam PostgreSQL RPC Function + SELECT FOR UPDATE

### Aturan Database Security (dari standar Philips)
27. Data PII sensitif (NIK, NPWP, rekening) WAJIB dienkripsi AES-256-GCM sebelum masuk database
28. Semua tabel WAJIB punya Row Level Security (RLS) policy
29. Tabel yang tumbuh cepat (bids, activity_logs) WAJIB dipartisi dari hari pertama
30. Semua tabel kritikal WAJIB punya immutable audit trigger

### Aturan Hardcode — Sesi #042–#045
31. DILARANG hardcode nilai konfigurasi bisnis → pakai getConfigValues()
32. DILARANG hardcode teks pesan/error/notifikasi → pakai getMessage() atau m()
33. DILARANG hardcode credential/API key → pakai getCredential()
34. DILARANG hardcode 'Asia/Jakarta' → pakai getPlatformTimezone()
35. PENGECUALIAN: 'WIB' (derived value) + 'id-ID' (platform invariant) → BOLEH di kode
36. PENGECUALIAN: 4 bootstrap secret di .env → BOLEH
37. NAV_POSITION (urutan sidebar) → konstanta di kode, TIDAK di DB (WooCommerce pattern)
38. URL path dashboard → derived dari feature_key di kode, TIDAK disimpan di DB
39. Redis TTL (REDIS_TTL constants di lib/redis.ts) → FALLBACK saja. Sumber kebenaran di config_registry (platform_general: redis_ttl_config_seconds, redis_ttl_messages_seconds, redis_ttl_credentials_seconds). Kode WAJIB baca dari DB via getConfigValue() dengan fallback ke REDIS_TTL constant.
40. Sidebar cache TTL (revalidate di unstable_cache layout.tsx) → dibaca dari config_registry (platform_general: sidebar_cache_ttl_seconds). Fallback 1800 detik.

### Aturan Proses
41. Setelah selesai setiap file — kabari nama file yang dibuat dan cara testingnya
42. Kerjakan SATU FILE dalam SATU instruksi — tidak boleh gabung beberapa file sekaligus

---

## PATH DATABASE POSTGRESQL
(Update Sesi #032 — tidak berubah kecuali tambahan Sesi #045)

Tabel utama:
- users — SuperAdmin (root level)
- tenants — daftar tenant/brand (termasuk nama_brand)
- user_profiles — semua user kecuali SuperAdmin
- platform_policies — policy platform (JSONB nilai per feature_key)
- config_registry — Dynamic Config Registry (feature_key, policy_key, nilai)
  - ⚠️ Sesi #045: tambah 4 key baru di feature_key 'platform_general':
    redis_ttl_config_seconds (600), redis_ttl_messages_seconds (900),
    redis_ttl_credentials_seconds (900), sidebar_cache_ttl_seconds (1800)
    SQL: scripts/add-redis-cache-ttl-config.sql — ⚠️ BELUM DIJALANKAN
- message_library — semua teks ke user (key, kategori, teks, variabel)
- service_providers, provider_field_definitions, provider_instances, instance_credentials — tabel credential
- account_locks — throttling login + progressive lockout
- session_logs — riwayat login PERMANEN
- otp_codes — kode OTP sementara
- trusted_devices — perangkat biometric
- user_presence — posisi user sekarang (UPSERT)
- activity_logs — log aktivitas PERMANEN partisi bulanan

Schema audit (terpisah):
- audit.log — perubahan data PERMANEN dengan hash chain
- audit.ddl_log — perubahan struktur database

---

## ARSITEKTUR POLICY — 2 LEVEL
(Update Sesi #032 — tidak berubah)

Level 1 (Platform Owner):
  Tabel: platform_policies WHERE feature_key = '[featureKey]'
  → nilai default + aturan override (tenant_can_override per field di JSONB)

Level 2 (Tenant Admin):
  Tabel: config_registry WHERE tenant_id = '[tenantId]' AND feature_key = '[featureKey]'
  → hanya field yang tenant_can_override = true yang bisa diisi

Fungsi merge: getEffectivePolicy(tenantId, featureKey)

---

## FEATURE KEYS YANG ADA DI config_registry
(Update Sesi #044 — tidak berubah. Catatan Sesi #045: platform_general +4 key cache TTL)

| feature_key | URL Path | Keterangan |
|---|---|---|
| security_login | /settings/security-login | 20 item aktif |
| platform_general | (tidak di sidebar) | 5 item: platform_timezone + 4 cache TTL Sesi #045 (pending SQL) |
| register_user | /settings/register-user | Belum ada data |
| register_vendor | /settings/register-vendor | Belum ada data |
| order_form | /settings/order-form | Belum ada data |
| bidding_vendor | /settings/bidding-vendor | Belum ada data |
| payment | /settings/payment | Belum ada data |
| branding | /settings/branding | Belum ada data |
| pesan | /settings/pesan | Belum ada data |
| sistem | /settings/sistem | Belum ada data |
| pilihan_opsi | /settings/pilihan-opsi | Belum ada data |

URL derivation rule: feature_key.replace(/_/g, '-') → /dashboard/superadmin/settings/{slug}

---

## TIGA SISTEM REALTIME
(Update Sesi #032 — tidak berubah)

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
Implementasi: TAHAP 5 (F) di sprint plan.

---

## STANDAR CACHE
(Update Sesi #045 — tambah Lapis 4: Redis L1 untuk API route handlers)

1. react.cache() — per-request deduplication
   → Untuk: verifyJWT(), session check
   → Scope: satu HTTP request, tidak shared antar user

2. unstable_cache (next/cache) — cross-request shared cache
   → Untuk: policy platform, config registry, message library, sidebar dashboard data
   → TTL: 15 menit (lib/), 30 menit (layout sidebar) — TTL dari config_registry
   → Invalidasi via revalidateTag()

3. Upstash Redis — edge + server persistent cache — L1 cache untuk API routes
   → Client: lib/redis.ts — getRedisClient() lazy init via getCredential() + env fallback
   → Untuk: /api/config/[feature_key] response cache (TTL dari config_registry)
   → Pattern cache-aside: cek Redis dulu (1–10ms) → miss → query Supabase (50–150ms) → simpan ke Redis
   → Explicit invalidation: PATCH /api/config → redis.del() + revalidateTag()
   → TTL diambil dari config_registry (platform_general.redis_ttl_config_seconds) — TIDAK hardcode
   → Juga dipakai untuk rate limiting di middleware.ts

4. MemoryCache (lib/cache.ts) — development fallback
   → Efektif HANYA di development (satu proses Node.js)
   → Di production Vercel: tidak efektif (serverless invocation terpisah)
   → Pakai react.cache() atau unstable_cache di production

---

*CLAUDE.md — 30 April 2026 — Sesi #077*
*Update: header disederhanakan, SUMBER KEBENARAN tanpa versi, SPRINT AKTIF Sesi #076-077, AUTH → getClaims() + Edge Function v5.*
*Reference ke dokumen lain tanpa nomor versi — versi aktif di DOCUMENT_REGISTRY.*
