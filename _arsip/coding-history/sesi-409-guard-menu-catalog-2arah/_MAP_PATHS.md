# _MAP_PATHS.md — Snapshot sesi-409-guard-menu-catalog-2arah

Arsip FLAT (keterbatasan bridge: write_file tak buat parent dir untuk path bersarang
+ path `[...slug]` — konvensi sama S#397/S#407). Peta nama arsip -> path asli di repo:

| File arsip (flat) | Path asli | Ukuran byte-exact (pra-edit S#409) |
|---|---|---|
| `nav.constant.ts`   | `lib/constants/nav.constant.ts`   | 8.013 B |
| `SidebarNav.tsx`    | `components/SidebarNav.tsx`       | 11.761 B |
| `package.json`      | `package.json`                    | 1.350 B |

## Konteks perubahan S#409 (L4 HUTANG-MENU-VISIBILITAS-GOVERNANCE — guard build-time 2-arah, Pilihan A)

FILE BARU (tanpa arsip):
- `lib/constants/menu-route.constant.ts` — fungsi shared `resolveMenuHref` + `SA_SETTINGS_BASE`/`SA_DASHBOARD_ROOT`.
- `lib/guards/menu-catalog.guard.test.ts` — guard Vitest 2-arah live-Supabase (scope super_admin).

FILE DIEDIT (arsip di sini):
- `nav.constant.ts` — `navItemToPath` delegasi ke `resolveMenuHref`; BUANG `SA_KNOWN_MENU_KEYS` + `warnUnknownMenuKeys` (digantikan guard build-time).
- `SidebarNav.tsx` — pakai `resolveMenuHref` shared (buang closure lokal `resolveHref`); buang import + panggilan `warnUnknownMenuKeys`.
- `package.json` — tambah script `"prebuild": "vitest run lib/guards"`.

Rollback: `git checkout` file terkait, atau salin isi dari folder arsip ini ke path asli.
Verifikasi hapus simbol export (`SA_KNOWN_MENU_KEYS`/`warnUnknownMenuKeys`) = ANDALKAN BUILD (pelajaran S#407: barrel/importer tersembunyi hanya ketangkap kompilator).
