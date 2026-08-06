'use client'

// app/global-error.tsx
// JARING TERAKHIR — menangkap kegagalan yang bahkan merobohkan ROOT LAYOUT (§B1 tabel penempatan).
// Dibuat: Sesi #443, melunasi sebagian #45 `HUTANG-LOOP-KONTAK-MAINTENANCE`.
//
// ⛔ WAJIB MEMBAWA `<html>` + `<body>` SENDIRI. Berkas ini MENGGANTIKAN root layout, bukan
//   dibungkus olehnya — jadi kalau kerangka HTML tidak ditulis di sini, tidak ada yang menulisnya.
//
// ⛔ TIDAK BOLEH `usePathname()`. Karena root layout diganti, konteks router TIDAK DIJAMIN ada
//   (§B1 langkah 1). Alamat dibaca dari `window.location.pathname` — dan itulah sebabnya
//   `ErrorFallbackView` menerima `routePath` sebagai PROP, bukan membacanya sendiri: satu tampilan
//   bersama yang menebak sendiri pasti salah di salah satu dari dua pemanggil ini.
//
// ⛔ SENGAJA NOL IMPOR KE APA PUN YANG MUNGKIN SUDAH PUTUS (§5.0.6). Nol font, nol provider, nol
//   Toaster — semuanya milik root layout yang, kalau kita sampai di sini, kemungkinan besar justru
//   dialah yang gagal. Jaring terakhir tidak boleh punya tali ke sesuatu yang sudah putus.
//   `globals.css` TETAP diimpor: ia aset waktu-build (Tailwind), bukan ketergantungan waktu-jalan.
//
// ⛔ BUKAN ROUTE — Next.js tidak memberinya URL (poin 4 Philips). Nol penjagaan perlu ditambahkan.

import './globals.css'
import { ErrorFallbackView } from '@/components/error/ErrorFallbackView'
import type { AreaLaporan }  from '@/lib/types/lapor-gangguan.type'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Penjaga `typeof window` dipasang karena berkas ini bisa ikut di-prerender saat build.
  // Efek `ErrorFallbackView` (yang mengirim laporan) HANYA jalan di peramban, dan pada render
  // KLIEN pertama `window` sudah ada ⇒ alamat yang ikut ke `app_error_log` selalu yang sebenarnya.
  const routePath = typeof window !== 'undefined' ? window.location.pathname : '/'

  // ⚠️ SATU-SATUNYA TEMPAT DI SELURUH JALUR INI YANG MENURUNKAN `area` DARI ALAMAT — dan itu SADAR.
  //   Empat penangkap lain menyatakan `area` secara harfiah karena masing-masing hanya memayungi
  //   satu permukaan. Berkas ini memayungi SEMUANYA sekaligus, jadi tidak ada pemanggil yang bisa
  //   menyatakannya; alamat adalah satu-satunya keterangan yang tersisa.
  //   ⛔ Ini BUKAN pengulangan `TEMUAN-429-AREA-HARDCODE` (#64). Yang #64 larang adalah komponen
  //   BERSAMA yang diam-diam memakai nilai bawaan `'publik'` untuk pemanggil yang sebenarnya tahu
  //   permukaannya — gagal senyap. Di sini kebalikannya: tidak ada yang tahu, penurunannya ditulis
  //   terbuka di tempat kejadian, dan alternatifnya (menulis `'publik'` harfiah) justru akan
  //   mencatat SETIAP runtuhnya layout dashboard sebagai laporan publik — tepat kesalahan #64.
  const area: AreaLaporan =
    routePath.startsWith('/dashboard/superadmin')  ? 'super_admin'  :
    routePath.startsWith('/dashboard/admintenant') ? 'admin_tenant' :
    routePath.startsWith('/dashboard/vendor')      ? 'vendor'       :
                                                     'publik'

  return (
    <html lang="id">
      <body className="min-h-full flex flex-col">
        <ErrorFallbackView
          error={error}
          reset={reset}
          area={area}
          routePath={routePath}
        />
      </body>
    </html>
  )
}
