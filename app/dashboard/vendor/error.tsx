'use client'

// app/dashboard/vendor/error.tsx
// Penangkap kegagalan render untuk SELURUH halaman di Dashboard Vendor — §B1 tabel penempatan berkas.
// Dibuat: Sesi #443, melunasi sebagian #45 `HUTANG-LOOP-KONTAK-MAINTENANCE`.
//
// ⛔ KENAPA TIDAK CUKUP `app/error.tsx` SAJA. `error.tsx` tidak menangkap kegagalan dari layout di
//   segmen yang SAMA (§B1 butir 1.3). Tanpa berkas ini, satu halaman dashboard yang gagal akan
//   dilempar ke penangkap publik di akar — dan pengguna kehilangan kerangka dashboardnya
//   (sidebar + header) padahal yang rusak cuma isi satu halaman.
//
// ⛔ BUKAN ROUTE. Next.js tidak memberi berkas ini URL ⇒ tidak ada alamat yang bisa diketik orang
//   iseng (poin 4 Philips). Jaminan STRUKTURAL, bukan pengecekan yang bisa lolos ⇒ nol penjagaan
//   perlu ditambahkan di sini.
//
// `area="vendor"` — nilai kolom `app_error_log.area` (NOT NULL), BUKAN nama folder route.
//   Dinyatakan pemanggil yang tahu permukaannya, tidak ditebak `ErrorFallbackView` dari alamat:
//   menebak area dari alamat = bentuk lain `TEMUAN-429-AREA-HARDCODE` (#64) yang ditutup S#435,
//   dan ia gagal SENYAP — data salah, layar terlihat normal.
//
// ⚠️ HASIL YANG BENAR TAPI MUDAH DIBACA SEBAGAI KEGAGALAN — #77 `TEMUAN-439-2-VENDOR-NOL-MENU`.
//   `dashboard_menus` NOL baris ber-`role_scope='vendor'` (diukur dari Supabase S#439), jadi
//   resolver §B1 langkah 1-5 di sini SELALU jatuh ke langkah 5: alamat mentah dipakai sebagai nama
//   halaman. Itu perilaku yang DIRANCANG, bukan bug — memajang nama key ke pengguna adalah bahasa
//   mesin jenis lain di layar yang justru ada untuk menghapus bahasa mesin (T-439-4).
//   ⛔ Saat TC-MTC dijalankan, ini JANGAN dicatat sebagai TC GAGAL. Katalog menu Vendor diisi di
//   STEP G-6 FASE Vendor, jauh di depan — tidak ditarik ke sesi ini.

import { usePathname }       from 'next/navigation'
import { ErrorFallbackView } from '@/components/error/ErrorFallbackView'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // §B1 langkah 1 — alamat halaman dari `usePathname()`, dioper PROP ke tampilan bersama.
  const pathname = usePathname()

  return (
    <ErrorFallbackView
      error={error}
      reset={reset}
      area="vendor"
      routePath={pathname}
    />
  )
}
