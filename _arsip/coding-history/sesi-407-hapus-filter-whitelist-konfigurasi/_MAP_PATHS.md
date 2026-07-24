# Peta Path Arsip — sesi-407-hapus-filter-whitelist-konfigurasi

Arsip FLAT (bukan mirror) — keterbatasan bridge (presedan S#397). Byte-exact terverifikasi via get_file_info.

LANGKAH 1 HUTANG-MENU-VISIBILITAS-GOVERNANCE (S#407): hapus filter whitelist grup Konfigurasi di SidebarNav (2 cabang) + buang SA_VALID_FEATURE_KEYS. Visibilitas → is_active semata (ATURAN 49 / SPEC Bagian 8, R1).

| File arsip (flat) | Path asal | Ukuran (byte, pra-edit) |
|---|---|---|
| `SidebarNav.tsx`   | `components/SidebarNav.tsx`          | 12612 |
| `nav.constant.ts`  | `lib/constants/nav.constant.ts`      | 8306  |
| `index.ts`         | `lib/constants/index.ts`             | 2595  |
| `settings__slug__page.tsx` | `app/dashboard/superadmin/settings/[...slug]/page.tsx` | 685 (via move_file; asal ber-BOM+CRLF) |

Catatan: `index.ts` (barrel) me-re-export `SA_VALID_FEATURE_KEYS` — KETINGGALAN di verifikasi awal S#407 (grep repo tak bisa: ripgrep dilarang, tanpa shell), terungkap saat `npm run build` gagal type-check. Re-export dibuang; ini bagian LANGKAH 1 yang sama.

Rollback: `git checkout <path>` ATAU salin file arsip ini kembali ke path asal.
