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
- `sesi-NNN-<label-singkat>` — gunakan label deskriptif

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

---

## LOG PERUBAHAN

| Tanggal | Sesi | Perubahan |
|---|---|---|
| 26 Apr 2026 | #057 | File dibuat. Snapshot `sesi-057-baseline` ditambahkan (4 file login flow). |
| 27 Apr 2026 | #058 | Snapshot `sesi-058-langkah-1` + `sesi-058-langkah-2` ditambahkan. |
| 25 Apr 2026 | #062 | Snapshot `sesi-062-hapus-biometric-login` + `sesi-062-vendor-ui-layout` ditambahkan. |
| 27 Apr 2026 | #064 | Snapshot `sesi-064-fix-double-getuser` + `sesi-064-layout-perf` ditambahkan. |
| 27 Apr 2026 | #068 | Snapshot `sesi-068-sendotp-parallel` + `sesi-068-unified-login` ditambahkan. |
| 27 Apr 2026 | #069 | Snapshot `sesi-069-bug013-shared-brandname` ditambahkan. |
| 29 Apr 2026 | #074 | Snapshot `sesi-074-concurrent-session` ditambahkan. |
| 29 Apr 2026 | #075 | Snapshot `sesi-075-perf-parallel-lock` + `sesi-075-custom-access-token-hook` ditambahkan. |
| 29 Apr 2026 | #076 | Snapshot `sesi-076-selesai-login-nonblocking` + `sesi-076-login-coldstart-opt` + `sesi-076-concurrent-banner` ditambahkan. |
| 30 Apr 2026 | #077 | Snapshot `sesi-077-vendor-rsc-jwt-claims` ditambahkan. |
| 1 Mei 2026  | #079 | Snapshot `sesi-079-dry-fix` ditambahkan. |
| 1 Mei 2026  | #080 | Snapshot `sesi-080-keep-warm-dashboard` ditambahkan. |
| 1 Mei 2026  | #081 | Snapshot `sesi-081-rsc-fix` ditambahkan. |
| 2 Mei 2026  | #084 | Snapshot `sesi-084-redis-otp` ditambahkan. |
| 2 Mei 2026  | #085 | Snapshot `sesi-085-redis-otp-fix` + `sesi-085-keep-warm-login` ditambahkan. |
| 4 Mei 2026  | #096 | Snapshot `sesi-096-pl-auth-26` ditambahkan. |
| 4 Mei 2026  | #097 | Snapshot `sesi-097-pl-s08-m1` ditambahkan. |
| 4 Mei 2026  | #098 | Snapshot `sesi-098-pl-s08-m2` ditambahkan. |
| 4 Mei 2026  | #099 | Snapshot `sesi-099-sidebar-opsi-b` ditambahkan. |
| 4 Mei 2026  | #100 | Snapshot `sesi-100-sentralisasi-ui` ditambahkan. |
| 5 Mei 2026  | #101 | Snapshot `sesi-101-dry-fix` ditambahkan. |
| 5 Mei 2026  | #105 | Snapshot `sesi-105-fix-bug-msg-channel` ditambahkan. |
| 5 Mei 2026  | #106 | Snapshot `sesi-106-fix-bug-dialog-tambah` ditambahkan. |
| **7 Mei 2026** | **#109** | **Snapshot `sesi-109-tenant-can-override` ditambahkan (3 file: `app/api/config/bulk/route.ts` + `security-login/page.tsx` + `ConfigPageClient.tsx` — sebelum refactor akses_ubah → tenant_can_override di UI flow SuperAdmin).** |
| **7 Mei 2026** | **#110** | **Snapshot `sesi-110-spinner-optimasi-config` ditambahkan (`ConfigPageClient.tsx` sebelum: tambah spinner Loader2 di button Simpan saat saving + ganti JSON.stringify full-compare → field-level diff di detectHasChanges()).** |
