# sesi-116-m4-sidebar-fix

# Snapshot 3 file SEBELUM fix sidebar M4 Master Dropdown.
# Tanggal: 8 Mei 2026 — Sesi #116
# Konteks: M4 FASE 5 verifikasi — smoke test lokal mengungkap menu sidebar M4 tidak tampil.

## Snapshot file

| File mirror | Versi sebelum fix |
|---|---|
| `components/SidebarNav.tsx` | filter sub-items grup Konfigurasi pakai `validFeatureKeys.has(item.key)` saja — item dengan `path` override ikut difilter |
| `lib/constants/nav.constant.ts` | item `pilihan_opsi` belum punya `path` override — resolve default ke `/settings/pilihan-opsi` (route yang tidak ada) |
| `app/dashboard/superadmin/dropdowns/DropdownGroupsTable.tsx` | `filtered.map(...)` pakai Fragment shorthand `<>` — tidak bisa terima `key` prop, trigger React warning |

## Apa yang diubah di file aktif

**SidebarNav.tsx** — 2 perubahan:
1. Filter sub-items grup Konfigurasi: tambah `item.path !== undefined` sebagai bypass — item dengan halaman sendiri (M2/M3/M4) tidak perlu cek `feature_key` di `config_registry`.
2. `isGroupActive('konfigurasi', path)`: tambah cek `path.includes('/dropdowns')` agar grup Konfigurasi auto-expand saat user buka langsung URL M4.

**nav.constant.ts** — 1 perubahan:
- Item `pilihan_opsi` ditambah `path: '/dashboard/superadmin/dropdowns'`.

**DropdownGroupsTable.tsx** — 1 perubahan:
- Import `Fragment` dari `react`.
- Ganti `<>...</>` di dalam `.map()` jadi `<Fragment key={grup.id}>...</Fragment>`.
- Hapus `key={grup.id}` dari `TableRow` di dalam Fragment (key dipindah ke Fragment).

## Akar masalah

Pola kerja S#114–S#115 menyelesaikan FASE 3 coding + FASE 4 registrasi cr_functions/classes/constants + dokumen — TAPI tidak ada langkah verifikasi:
1. Entry `nav.constant.ts` untuk modul baru
2. Path consistency: `navItemToPath(item)` harus resolve ke route folder yang ada
3. Sidebar filter `feature_key` config_registry — item dengan halaman sendiri harus bypass
4. Smoke test end-to-end lokal: klik menu → halaman load tanpa 404

ATURAN 32 + Task_Flow checklist akan diupdate di Sesi #116 untuk menutup gap ini.
