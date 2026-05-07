# INDEX — Coding History Archive

**Folder ini menyimpan snapshot file kode SEBELUM perubahan besar/refactor.**

**Tujuan:** Memungkinkan perbandingan "sebelum vs sesudah" refactor, dan rollback manual kalau ternyata refactor menyebabkan regresi.

**Aturan yang melahirkan folder ini:** CODING_RULES_AI — **ATURAN 12: Arsip Coding Sebelum Refactor**

---

## STRUKTUR FOLDER

```
_arsip/
└── coding-history/
    ├── INDEX.md                     ← file ini
    └── sesi-NNN-<label>/             ← snapshot per sesi refactor
        └── <mirror dari struktur project>
```

---

## CARA PAKAI

- Buka file lama di `_arsip/coding-history/sesi-NNN-.../path/ke/file.ts`
- Buka file sekarang di lokasi aslinya
- Pakai VS Code diff (right-click → Compare with Selected)

---

## LOG PERUBAHAN

| Tanggal | Sesi | Perubahan |
|---|---|---|
| 26 Apr 2026 | #057 | Snapshot `sesi-057-baseline` ditambahkan (4 file login flow). |
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
| **7 Mei 2026** | **#109** | **Snapshot `sesi-109-tenant-can-override` ditambahkan (3 file: `route.ts` + `page.tsx` + `ConfigPageClient.tsx` — sebelum refactor akses_ubah → tenant_can_override).** |
| **7 Mei 2026** | **#110** | **Snapshot `sesi-110-spinner-optimasi-config` ditambahkan (`ConfigPageClient.tsx` sebelum: Loader2 spinner + field-level detectHasChanges).** |
| **7 Mei 2026** | **#110** | **Snapshot `sesi-110-fix-isactive` ditambahkan (2 file: `page.tsx` + `ConfigPageClient.tsx` — sebelum: hapus `.eq('is_active', true)` dari query + tambah `enabled` ke detectHasChanges + `is_active` ke handleSave payload).** |
