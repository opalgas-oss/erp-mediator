# INDEX — Coding History Archive

**Folder ini menyimpan snapshot file kode SEBELUM perubahan besar/refactor.**

**Tujuan:** Memungkinkan perbandingan "sebelum vs sesudah" refactor, dan rollback manual kalau ternyata refactor menyebabkan regresi.

**Aturan yang melahirkan folder ini:** CODING_RULES_AI_v1.md — **ATURAN 12: Arsip Coding Sebelum Refactor**

---

## STRUKTUR FOLDER

```
_arsip/
└── coding-history/
    ├── INDEX.md                     ← file ini
    └── sesi-NNN-<label>/             ← snapshot per sesi refactor
        └── <mirror dari struktur project>
            └── path/ke/file.ts
```

**Konvensi nama folder snapshot:**
- `sesi-057-baseline` — snapshot awal sebelum refactor dimulai (untuk jadi referensi)
- `sesi-058-langkah-1` — snapshot sebelum LANGKAH 1 refactor (Next.js after())
- `sesi-058-langkah-2` — snapshot sebelum LANGKAH 2 refactor (server action login)
- `sesi-NNN-<label-singkat>` — gunakan label deskriptif

---

## DAFTAR SNAPSHOT

### sesi-057-baseline (26 April 2026)

**Konteks:** Snapshot kondisi login flow di AKHIR Sesi #057 — sebelum refactor arsitektur besar yang direncanakan di Sesi #058.

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `lib/hooks/useLoginFlow.ts` | Hook login state machine — 4 API call blocking sequential |
| `lib/hooks/login/loginApiCalls.ts` | 10 fetch functions ke `/api/auth/*` |
| `lib/hooks/login/loginSessionHelpers.ts` | Helper ambilNamaSuperadmin + tulisSessionLogSuperadmin + aturCookieSession |
| `app/api/auth/load-user-profile/route.ts` | Server-side shared function (dengan fix Zod regex BUG-003) |

**Kenapa diarsipkan:** Sesi #058 akan mengubah arsitektur login secara signifikan (target <2,5 detik dari 8-9 detik).

**Posisi testing:** SA login LAMBAT 8-9 detik (BUG-006 OPEN). Vendor APPROVED blocked BUG-005.

**Git reference:** branch `dev`, commit hash terakhir `521a411`.

---

### sesi-058-langkah-1 (27 April 2026)

**Konteks:** Snapshot sebelum LANGKAH 1 — mengubah 3 route handler pakai Next.js `after()` untuk post-response background tasks.

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `app/api/auth/session-log/route.ts` | Route handler — sebelum pakai `after()` |
| `app/api/auth/user-presence/route.ts` | Route handler — sebelum pakai `after()` |
| `app/api/auth/activity-log/route.ts` | Route handler — sebelum pakai `after()` |

**Hasil LANGKAH 1:** `after()` terbukti bekerja — saving aktual ~0,3 detik. Commit `a36b687c`.

---

### sesi-058-langkah-2 (27 April 2026)

**Konteks:** Snapshot sebelum LANGKAH 2 — menggabungkan 5 operasi login SA jadi 1 server action `loginSuperadminAction`.

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `lib/hooks/useLoginFlow.ts` | Hook login — sebelum `handleLogin` panggil server action |

**Hasil LANGKAH 2:** Saving aktual ~0,5-1 detik. Commit `644317b4`.

---

### sesi-062-hapus-biometric-login (25 April 2026)

**Konteks:** Keputusan Philips Sesi #061 — Biometric DIHAPUS dari login flow. Biometric hanya ada di Register (ditawarkan jika device support) dan Dashboard Settings. Login post-OTP langsung `selesaiLogin()`.

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `app/login/page.tsx` | Orchestrator — sebelum hapus `import BiometricStage` + render block BIOMETRIC |
| `lib/hooks/useLoginFlow.ts` | Hook — sebelum hapus `useBiometric`, `handleAktifkanBiometric`, `handleLewatiBiometric`, ganti 3x `setTahap('BIOMETRIC')` → `selesaiLogin()` |

**Kenapa diarsipkan:** Refactor menyentuh orkestrasi login flow — ubah 9 titik di `useLoginFlow.ts` + 3 titik di `page.tsx`. Rollback diperlukan jika ada regresi flow lama.

**Posisi testing saat snapshot:** TC-D03 Vendor APPROVED LULUS Sesi #061. SA login ~1,34s.

**Hasil setelah refactor:** Build 29/29 ✅. Post-OTP verified → langsung masuk dashboard tanpa layar Biometric ✅.

---

### sesi-062-vendor-ui-layout (25 April 2026)

**Konteks:** Koreksi Philips Sesi #062 — UI/UX dashboard Vendor harus sama dengan SA dashboard. Sebelumnya: standalone page dengan logout button. Sesudah: DashboardShell pattern dengan sidebar + header.

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `app/dashboard/vendor/layout.tsx` | Layout lama — hanya `<div min-h-screen bg-gray-50>` tanpa DashboardShell |
| `app/dashboard/vendor/page.tsx` | Page lama — standalone dengan logout button, fetch message_library sendiri |

**File baru yang dibuat (tidak diarsipkan — baru):**
- `components/VendorSidebarNav.tsx` — 8 menu vendor (Ringkasan, Order Masuk, Bidding Aktif, Order Dikerjakan, Produk, History, Edit Profil, Ganti Password), responsive, GPS info
- `components/VendorDashboardShell.tsx` — wrapper VendorSidebarNav + DashboardHeader (shared)

**Kenapa diarsipkan:** Rewrite > 20 baris di `layout.tsx` (server component async + VendorDashboardShell) dan `page.tsx` (hapus logout + simplify ke content area).

**Hasil setelah refactor:** Build 29/29 ✅. Sidebar + header live ✅. Logout via DashboardHeader (avatar dropdown) ✅.

---

### sesi-064-fix-double-getuser (27 April 2026)

**Konteks:** Fix performa — setiap request ke `/dashboard/*` memanggil `supabase.auth.getUser()` DUA KALI:
- `middleware.ts` Guard 5 → getUser() #1 (~100-150ms network)
- `layout.tsx` → `verifyJWT()` → getUser() #2 (~100-150ms network lagi)

**Fix yang diimplementasikan:**
1. `middleware.ts` — setelah getUser() berhasil, set request headers: `x-user-id`, `x-user-role`, `x-tenant-id`, `x-user-display-name`
2. `lib/auth-server.ts` — `verifyJWT()` baca headers dulu. Jika ada → pakai langsung, skip getUser()

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `middleware.ts` | Guard 5 — sebelum tambah propagasi header dan refactor setAll callback |
| `lib/auth-server.ts` | verifyJWT() — sebelum tambah logika baca x-user-* headers |

**Target performa:** Cold start 550ms → ~350ms (eliminasi 1 network round-trip ke Supabase Auth).

**Posisi testing saat snapshot:** SA login ~1,24s ✅. Build 29/29 commit `543fb3b`.

---

## CARA PAKAI

### Untuk Membandingkan Sebelum vs Sesudah Refactor

1. Buka file lama di folder `_arsip/coding-history/sesi-NNN-.../path/ke/file.ts`
2. Buka file sekarang di `path/ke/file.ts` (lokasi aslinya)
3. Pakai diff tool (VS Code: right-click → Compare with Selected) untuk lihat perbedaan

### Untuk Rollback Manual (Restore)

⚠️ **Jangan asal overwrite.** Pertimbangkan dulu:
- Apakah arsip masih kompatibel dengan state project sekarang (dependency, schema DB, dll)?
- Apakah ada perubahan lain setelah arsip dibuat yang ikut kehilangan?

Kalau yakin mau rollback, copy file arsip ke lokasi aslinya, lalu `npm run build` untuk verifikasi.

### Untuk Membuat Snapshot Baru (Sebelum Refactor)

1. Tentukan file mana yang akan direfactor
2. Buat folder: `_arsip/coding-history/sesi-NNN-<label>/` mengikuti struktur path project
3. Copy isi file (saat ini, sebelum diubah) ke folder snapshot
4. **Update INDEX.md ini dengan entry baru** ← WAJIB, sering dilupakan
5. Baru lanjut refactor di file asli

---

## CATATAN

- Folder `_arsip/` sudah ada di `.gitignore` atau di-exclude dari build? **PERLU DICEK.** Kalau tidak, snapshot ini ikut ke-push ke Git — itu OK tapi bikin repo size membesar.
- Alternatif di masa depan: pakai git branch atau git tag untuk snapshot, tapi untuk workflow AI coding yang rawan lupa push, folder fisik lebih aman.

---

## LOG PERUBAHAN

| Tanggal | Sesi | Perubahan |
|---|---|---|
| 26 Apr 2026 | #057 | File dibuat. Snapshot `sesi-057-baseline` ditambahkan (4 file login flow). |
| 27 Apr 2026 | #058 | Snapshot `sesi-058-langkah-1` ditambahkan (3 route handler sebelum pakai `after()`). |
| 27 Apr 2026 | #058 | Snapshot `sesi-058-langkah-2` ditambahkan (`useLoginFlow.ts` sebelum panggil server action). |
| **25 Apr 2026** | **#062** | **Snapshot `sesi-062-hapus-biometric-login` ditambahkan (`page.tsx` + `useLoginFlow.ts` sebelum hapus BIOMETRIC stage).** |
| **25 Apr 2026** | **#062** | **Snapshot `sesi-062-vendor-ui-layout` ditambahkan (`vendor/layout.tsx` + `vendor/page.tsx` sebelum rewrite ke VendorDashboardShell).** |
| **27 Apr 2026** | **#064** | **Snapshot `sesi-064-fix-double-getuser` ditambahkan (`middleware.ts` + `lib/auth-server.ts` sebelum fix propagasi header untuk eliminasi getUser() ke-2).** |
| **27 Apr 2026** | **#064** | **Snapshot `sesi-064-layout-perf` ditambahkan (`superadmin/layout.tsx` + `vendor/layout.tsx` sebelum fix: SA pindah unstable_cache ke module-level + hapus getConfigValue TTL; Vendor tambah cache brandName+messages).** |
| **27 Apr 2026** | **#068** | **Snapshot `sesi-068-sendotp-parallel` ditambahkan (`lib/services/otp.service.ts` sebelum refactor sendOTP() dari 6 sequential call → Promise.all 5 call paralel).** |
| **27 Apr 2026** | **#068** | **Snapshot `sesi-068-unified-login` ditambahkan (`app/login/actions.ts` + `lib/hooks/useLoginFlow.ts` sebelum refactor ke loginUnifiedAction() — 1 signInWithPassword untuk semua role).** |
| **27 Apr 2026** | **#069** | **Snapshot `sesi-069-bug013-shared-brandname` ditambahkan (`superadmin/layout.tsx` + `vendor/layout.tsx` sebelum refactor BUG-013: shared `getBrandName()` via `lib/dashboard-data.ts` dengan `unstable_cache` module-level).** |
| **29 Apr 2026** | **#074** | **Snapshot `sesi-074-concurrent-session` ditambahkan (3 file sebelum fix concurrent session: `app/api/auth/check-session/route.ts` + `app/login/actions.ts` + `lib/hooks/useLoginFlow.ts`).** |
| **29 Apr 2026** | **#075** | **Snapshot `sesi-075-perf-parallel-lock` ditambahkan (`app/login/actions.ts` + `app/api/keep-warm/route.ts` sebelum parallelkan cekLockAwal+signInWithPassword dan update keep-warm fan-out).** |
| **29 Apr 2026** | **#075** | **Snapshot `sesi-075-custom-access-token-hook` ditambahkan (`app/login/login-action-helpers.ts` sebelum expand decodeAppClaims: tambah nama/vendorStatus/nomorWa dari JWT. Edge Function v5 di-deploy: inject nama+vendor_status+nomor_wa ke JWT. middleware.ts update getClaims() fast path).** |
| **29 Apr 2026** | **#076** | **Snapshot `sesi-076-selesai-login-nonblocking` ditambahkan (3 file sebelum optimasi Temuan 1+2: `lib/hooks/useLoginFlow.ts` + `lib/hooks/login/loginApiCalls.ts` + `app/api/auth/session-log/route.ts` — sebelum selesaiLogin() jadi non-blocking + cegah double signInWithPassword di catch block).** |
| **29 Apr 2026** | **#076** | **Snapshot `sesi-076-login-coldstart-opt` ditambahkan (`app/login/actions.ts` sebelum: LOGIN_FORM_SCHEMA ke module-level + getConfigValues parallel dalam Promise.all — cold start benefit ~50-80ms).** |
| **29 Apr 2026** | **#076** | **Snapshot `sesi-076-concurrent-banner` ditambahkan (4 file sebelum I-05: `components/DashboardShell.tsx` + `components/VendorDashboardShell.tsx` + `app/dashboard/superadmin/layout.tsx` + `app/dashboard/vendor/layout.tsx` — sebelum tambah ConcurrentSessionBanner + cekSesiParalel parallel di layout RSC).** |
| **30 Apr 2026** | **#077** | **Snapshot `sesi-077-vendor-rsc-jwt-claims` ditambahkan (3 file sebelum Vendor RSC fix: `middleware.ts` + `lib/auth-server.ts` + `app/dashboard/vendor/layout.tsx` — sebelum extract `vendor_status` dari JWT claims + propagasi via header `x-vendor-status` + skip query DB di Vendor layout).** |
| **1 Mei 2026** | **#080** | **Snapshot `sesi-080-keep-warm-dashboard` ditambahkan (`app/api/keep-warm/route.ts` sebelum fan-out ping dashboard SA+Vendor).** |
| **1 Mei 2026** | **#081** | **Snapshot `sesi-081-rsc-fix` ditambahkan (`app/dashboard/superadmin/layout.tsx` sebelum Fix RSC Tahap 1: pindah getConfigValue ke Promise.all + hilangkan waterfall sequential).** |
| **1 Mei 2026** | **#079** | **Snapshot `sesi-079-dry-fix` ditambahkan (7 file sebelum DRY refactor BLOK B: `DashboardShell.tsx` + `VendorDashboardShell.tsx` + `SidebarNav.tsx` + `VendorSidebarNav.tsx` + `DashboardHeader.tsx` + `superadmin/layout.tsx` + `vendor/layout.tsx` — sebelum: extract getCookie+interpolate ke lib/utils-client.ts, buat useGpsInfo hook, merge DashboardShell generic dengan Mobile Sidebar Context, fix hardcode VendorSidebarNav, tambah messages cache Vendor).** |
| **2 Mei 2026** | **#084** | **Snapshot `sesi-084-redis-otp` ditambahkan (`lib/services/otp.service.ts` sebelum E2 Redis OTP Phase 1: Redis SET primary + PostgreSQL async audit di sendOTP(), Redis GET fast path + fallback PostgreSQL SP di verifyAndConsume()).** |
| **2 Mei 2026** | **#085** | **Snapshot `sesi-085-redis-otp-fix` ditambahkan (`lib/services/otp.service.ts` sebelum fix TC-E04: type mismatch `storedCode === inputCode` — Upstash auto-JSON.parse numeric string menjadi number, strict equality selalu false → fix dengan `String(storedCode)`).** |
| **2 Mei 2026** | **#085** | **Snapshot `sesi-085-keep-warm-login` ditambahkan (`app/api/keep-warm/route.ts` sebelum fix cold start login flow: tambah direct ping ke /login + /api/auth/send-otp + /api/auth/verify-otp + /api/auth/check-session — sebelumnya hanya ping /api/auth/warmup yang tidak menjamin bundle terpisah ikut warm).** |
| **4 Mei 2026** | **#096** | **Snapshot `sesi-096-pl-auth-26` ditambahkan (`middleware.ts` sebelum PL-AUTH-26: tambah ekstrak `memberships[]` + `is_super_admin` dari JWT v7 — Edge Function v7 — serta propagasi 2 header baru `x-user-memberships` + `x-is-super-admin`).** |
| **4 Mei 2026** | **#097** | **Snapshot `sesi-097-pl-s08-m1` ditambahkan (`components/ConfigItem.tsx` sebelum L3: tambah type `timing` + `json-per-role` untuk support field timing dan JSON per-role di M1 Config & Policy Management).** |
