// lib/constants/maintenance.constant.ts
// LAPIS 1 dari tiga lapis anti-lockout gerbang maintenance (§4 A2 DESAIN_MAINTENANCE_DAN_KONTAK_TIM).
//
// Dibuat: Sesi #435 — FASE 3.6e sub-fitur A. Acuan:
//   Arsitektur_Project/03_Architecture/00_Global/DESAIN_MAINTENANCE_DAN_KONTAK_TIM/
//     ..._GERBANG_MAINTENANCE.md (§4 A1 matriks permukaan · A2 tiga lapis · A3 saklar per-area)
//
// ⛔ PENGECUALIAN SADAR TERHADAP ATURAN 8 (anti-hardcode) — DINYATAKAN TERBUKA, BUKAN DISELUNDUPKAN.
//   Yang di-hardcode di berkas ini BUKAN nilai bisnis, melainkan JALAN PULANG. Kalau daftar ini
//   bisa diubah dari Dashboard SA, SuperAdmin bisa mencentang "blokir Dashboard SA" lalu kehilangan
//   satu-satunya pintu untuk membatalkannya — terkunci di luar platformnya sendiri, tanpa tim IT
//   yang bisa membukanya dari belakang. Nilai maintenance yang MEMANG bisnis (mode, judul, pesan,
//   ilustrasi, tema, ETA, tampilkan-kontak) tetap hidup di `config_registry` feature_key `sistem`
//   dan dibaca `lib/maintenance.ts` — berkas ini tidak menyentuh satu pun dari nilai itu.
//
// EDGE RUNTIME SAFE — nol impor NILAI, nol efek samping, nol `server-only`. Sengaja begitu supaya
// berkas ini boleh dibaca Server Component, Client Component, maupun berkas guard build-time
// tanpa menyeret modul lain ikut ke bundel. Satu-satunya impor di bawah adalah `import type`,
// yang dihapus TypeScript saat kompilasi dan menunjuk berkas yang juga netral.

import type { AreaLaporan } from '@/lib/types/lapor-gangguan.type'

// ─── AREA ─────────────────────────────────────────────────────────────────────

/**
 * Nama area permukaan platform = `AreaLaporan`, DIPAKAI ULANG, bukan diketik ulang di sini.
 *
 * ⚠️ KOREKSI S#435 atas kesalahan Claude di versi pertama berkas ini: tipe lokal `AreaGerbang`
 * sempat ditulis dengan nilai `'admintenant'` (tanpa garis bawah) — itu nama FOLDER ROUTE
 * (`app/dashboard/admintenant/`), BUKAN nilai kolom. Nilai yang sah adalah `'admin_tenant'`,
 * ditegakkan `CHECK chk_app_error_log_area` di Supabase. Kalau diteruskan, setiap laporan
 * gangguan dari Dashboard AT ditolak database — kelas persis BUG-039 (`is_aktif` vs `is_active`).
 *
 * Menyalin daftar nilainya ke sini juga melanggar ATURAN 36: satu fakta, satu rumah. Rumahnya
 * `lib/types/lapor-gangguan.type.ts` — berkas yang memang sengaja dibuat netral (nol impor,
 * nol efek samping, nol `server-only`) supaya boleh dibaca server maupun klien.
 */
export type AreaGerbang = AreaLaporan

/**
 * Area yang DIBLOK saat `maintenance_mode = true`.
 *
 * Isi daftar ini berasal dari matriks §4 A1 dan hanya boleh bertambah bersamaan dengan
 * penambahan baris di matriks itu — bukan sebaliknya. Dashboard Customer belum lahir, jadi
 * belum ada di sini; ia ditambahkan saat dashboard-nya dibuat.
 *
 * ⚠️ `'admin_tenant'` PAKAI GARIS BAWAH — itu nilai kolom, bukan nama folder route
 * `app/dashboard/admintenant/`. Keduanya memang berbeda, dan perbedaan itu sudah pernah
 * memakan korban (BUG-039). Jangan "dirapikan" agar seragam dengan nama folder.
 */
export const AREA_DIBLOK: readonly AreaGerbang[] = ['publik', 'vendor', 'admin_tenant'] as const

/**
 * Area yang EXEMPT PERMANEN — tidak pernah digerbangi, apa pun nilai config.
 *
 * `super_admin` ada di sini karena Dashboard SA adalah SATU-SATUNYA tempat maintenance bisa
 * dimatikan kembali. Menggerbanginya berarti menyalakan maintenance = tidak bisa dimatikan lagi.
 */
export const AREA_EXEMPT_PERMANEN: readonly AreaGerbang[] = ['super_admin'] as const

// ─── RUTE JALAN PULANG ────────────────────────────────────────────────────────

/**
 * Rute yang WAJIB tetap terbuka saat maintenance menyala — "jalan pulang".
 *
 * Daftar ini TIDAK dipakai untuk memutuskan apa pun saat runtime: gerbang dipasang di
 * entry-layout (K-412-4), bukan di middleware, sehingga rute yang tidak memasang
 * `MaintenanceGate` otomatis terbuka. Daftar ini adalah ACUAN yang dibaca manusia dan
 * DITEGAKKAN oleh guard build-time (Lapis 2) — ia menjawab pertanyaan "berkas mana yang
 * DILARANG memasang gerbang", bukan "rute mana yang sedang terbuka".
 *
 * Alasan tiap baris ada di §4 A1; yang paling mudah terlupakan: `/forgot-password` dan
 * `/reset-password` — SA yang lupa sandi saat maintenance menyala akan terkunci total tanpa
 * keduanya, dan `/aktivasi` + `/auth/verify` — tautan undangan AT punya masa berlaku, jadi
 * memblokirnya sama dengan menghanguskan undangan yang sudah dikirim.
 */
export const RUTE_JALAN_PULANG: readonly string[] = [
  '/sa/masuk',
  '/at/masuk',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/aktivasi',
  '/auth/verify',
  '/init-philipsliemena',
  '/dashboard',            // router murni — hanya mengarahkan, tidak menampilkan apa pun
  '/api',                  // gerbang ini urusan TAMPILAN; memblok API mematikan tombol mematikan maintenance
] as const

// ─── PENEGAKAN LAPIS 2 (dibaca guard build-time) ──────────────────────────────

/**
 * Berkas TUNGGAL yang DILARANG memasang gerbang. Dilanggar ⇒ `npm run build` GAGAL.
 *
 * Dipisah dari `PREFIKS_BERKAS_DILARANG_MENGGERBANG` karena ini satu berkas persis, bukan pohon.
 */
export const BERKAS_DILARANG_MENGGERBANG: readonly string[] = [
  'app/dashboard/superadmin/layout.tsx',
] as const

/**
 * Pohon berkas yang DILARANG memasang gerbang — seluruh isinya, sedalam apa pun.
 * Dilanggar ⇒ `npm run build` GAGAL.
 *
 * Kenapa guard, bukan catatan di dokumen: catatan bisa dilewati sesi berikutnya tanpa ada yang
 * tahu; build yang gagal tidak bisa dilewati diam-diam.
 */
export const PREFIKS_BERKAS_DILARANG_MENGGERBANG: readonly string[] = [
  'app/sa/',
  'app/at/',
  'app/login/',
  'app/forgot-password/',
  'app/reset-password/',
  'app/aktivasi/',
  'app/auth/',
  'app/init-philipsliemena/',
] as const

/**
 * Nama simbol yang kehadirannya di berkas terlarang dianggap "memasang gerbang".
 * Dipakai guard Lapis 2 sebagai kata yang dicari di isi berkas.
 */
export const SIMBOL_GERBANG: readonly string[] = [
  'MaintenanceGate',
  'MaintenanceView',
] as const
