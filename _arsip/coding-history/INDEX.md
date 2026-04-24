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

**Konteks:** Snapshot kondisi login flow di AKHIR Sesi #057 — sebelum refactor arsitektur besar yang direncanakan di Sesi #058 (menghapus 3 blocking API call, menambah Supabase Custom Access Token Hook, implementasi `waitUntil()` pattern).

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `lib/hooks/useLoginFlow.ts` | Hook login state machine — 4 API call blocking sequential |
| `lib/hooks/login/loginApiCalls.ts` | 10 fetch functions ke `/api/auth/*` |
| `lib/hooks/login/loginSessionHelpers.ts` | Helper ambilNamaSuperadmin + tulisSessionLogSuperadmin + aturCookieSession |
| `app/api/auth/load-user-profile/route.ts` | Server-side shared function (dengan fix Zod regex BUG-003) |

**Kenapa diarsipkan:**
- Sesi #058 akan mengubah arsitektur login secara signifikan (target <2,5 detik dari 8-9 detik)
- Perubahan akan menyentuh `handleSuperadminLogin`, `muatDataUser`, `selesaiLogin`, dan menghapus beberapa blocking call
- Snapshot ini jadi referensi: "sebelum refactor Sesi #058, kodenya begini"
- Kalau refactor gagal atau Philips minta rollback → bisa bandingkan/restore dari sini

**Posisi testing saat snapshot diambil:**
- SuperAdmin login: ✅ berhasil tapi **LAMBAT 8-9 detik** (BUG-006 OPEN)
- Vendor APPROVED login: ⚠️ sampai OTP screen tapi send-otp return 500 (BUG-005 OPEN)
- TC-D01 (Vendor PENDING): belum dijalankan di sesi ini
- TC-D02 (Vendor REVIEW): belum dijalankan di sesi ini
- TC-D03 (Vendor APPROVED): blocked oleh BUG-005

**Git reference (untuk verifikasi):** branch `dev`, commit setelah fix BUG-004 + BUG-003 push — commit hash terakhir `521a411` (per `git log` Sesi #057).

---

### sesi-058-langkah-1 (27 April 2026)

**Konteks:** Snapshot sebelum LANGKAH 1 refactor — mengubah 3 route handler supaya pakai Next.js `after()` untuk post-response background tasks. Target: hilangkan ~1,4 detik blocking dari session-log yang di-await browser.

**Pendekatan satu-per-satu (konsep kerja Philips):** LANGKAH 1 ini satu dari 4 langkah berurutan (semua gratis) — selesaikan satu + test, baru lanjut LANGKAH 2. Tidak dikerjakan paralel.

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `app/api/auth/session-log/route.ts` | Route handler — sebelum pakai `after()` untuk INSERT session log |
| `app/api/auth/user-presence/route.ts` | Route handler — sebelum pakai `after()` untuk upsert presence |
| `app/api/auth/activity-log/route.ts` | Route handler — sebelum pakai `after()` untuk insert activity log |

**Kenapa diarsipkan:**
- LANGKAH 1 mengubah timing eksekusi dari 3 route handler: dulu `await service(...)` lalu return → sekarang return dulu, service jalan di `after()`.
- Kalau ada regresi (misal session_id tidak sempat di-INSERT saat browser sudah pakai untuk activity-log), bisa compare/rollback dari sini.

**Posisi testing saat snapshot diambil:**
- Sama dengan sesi-057-baseline (TC-D01~D03 masih blocked oleh BUG-005+006).
- Login SuperAdmin masih 8-9 detik.

**Hasil LANGKAH 1 (setelah deploy):** `after()` **terbukti bekerja** — baris session_logs masuk ~1 detik SETELAH response terkirim ke client. TAPI total saving dari perspektif browser hanya **~0,3 detik** (7,4s → 7,1s). Sisa bottleneck = `verifyJWT()` (~400ms × 4 route) + cold start serverless function. Bukan DB INSERT yang utama.

---

### sesi-058-langkah-2 (27 April 2026)

**Konteks:** Snapshot sebelum LANGKAH 2 refactor — menggabungkan 5 operasi login SuperAdmin (check-lock + signInWithPassword + load-user-profile + set cookies + session-log/presence) jadi **1 server action** `loginSuperadminAction` di `app/login/actions.ts`. Target: hilangkan 3-4 kali `verifyJWT()` + 3-4 cold start dari blocking path.

**Alasan strategis (dari investigasi LANGKAH 1):** Bottleneck utama BUKAN DB INSERT (itu sudah `after()`), tapi **banyaknya round-trip HTTP dari browser**. Setiap round-trip bayar: cold start + `verifyJWT()` call ke Supabase Auth (~400ms). Gabungkan jadi 1 action → eliminasi 3-4 dari ongkos ini.

**Scope LANGKAH 2 TERBATAS ke SUPERADMIN:**
- Vendor, Customer, AdminTenant → action signOut() dan return `errorKey='NOT_SUPERADMIN'`, client fallback ke flow lama (TIDAK ada regresi untuk role non-SA).
- Vendor optimization direncanakan di LANGKAH 3 (beda sesi/langkah).

**File yang diarsipkan:**

| Path | Catatan |
|---|---|
| `lib/hooks/useLoginFlow.ts` | Hook login — sebelum `handleLogin` dimodifikasi untuk coba server action dulu |

**File yang AKAN dibuat/dimodifikasi (bukan snapshot, tapi daftar perubahan):**

| Path | Jenis perubahan |
|---|---|
| `app/login/actions.ts` | **BARU** — server action `loginSuperadminAction` |
| `lib/hooks/useLoginFlow.ts` | **DIMODIFIKASI** — `handleLogin` coba action dulu, fallback ke flow lama jika role bukan SA |

**Posisi testing saat snapshot diambil:**
- LANGKAH 1 sudah merged ke `dev` (commit `a36b687c`).
- Login SuperAdmin masih ~7,1 detik (target LANGKAH 2: <4,5 detik).

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
4. Update INDEX.md ini dengan entry baru
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
