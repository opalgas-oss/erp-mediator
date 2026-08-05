'use client'

// app/error.tsx
// Penangkap kegagalan render untuk HALAMAN PUBLIK — pengunjung yang belum login.
// Dibuat: Sesi #439, bagian B (§B1 tabel penempatan berkas).
//
// ⛔ BERKAS INI BUKAN ROUTE. Next.js tidak memberinya URL, jadi tidak ada alamat `/error` yang bisa
//   diketik siapa pun. Itulah yang memenuhi syarat "tidak bisa dipanggil orang iseng" (poin 4
//   Philips) secara MEKANIS — jaminan struktural, bukan pengecekan yang bisa lolos. Karena itu
//   TIDAK ADA penjagaan apa pun yang perlu ditambahkan di sini.
//
// ⛔ WAJIB Client Component — batas Next.js, bukan pilihan. Akibatnya ia tidak bisa menerima prop
//   dari server, sehingga seluruh isi halaman dibaca dari sisi klien (`ErrorFallbackView`).
//
// ⚠️ YANG TIDAK DITANGKAP BERKAS INI: kegagalan di root layout — `error.tsx` tidak menangkap error
//   dari layout pada segmen yang SAMA. Itu tugas `app/global-error.tsx` (jaring terakhir, §B1).
//   Halaman di dalam `app/dashboard/*` juga punya penangkapnya sendiri supaya kerangka dashboard
//   (sidebar + header) tidak ikut hilang saat satu halaman di dalamnya gagal.
//
// `area="publik"` — nilai kolom `app_error_log.area` (NOT NULL), bukan nama folder route.
//   SENGAJA ditulis di sini, bukan ditebak `ErrorFallbackView` dari alamat halaman: menebak area
//   dari alamat adalah bentuk lain dari `TEMUAN-429-AREA-HARDCODE` (#64) yang sudah ditutup S#435 —
//   ia gagal SENYAP (data salah, layar normal). Pemanggil yang tahu permukaannya yang menyatakannya.

import { usePathname }       from 'next/navigation'
import { ErrorFallbackView } from '@/components/error/ErrorFallbackView'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // §B1 langkah 1 — alamat halaman dari `usePathname()`. `global-error.tsx` TIDAK bisa memakai ini
  // (ia menggantikan root layout, konteks router tidak dijamin ada) dan memakai
  // `window.location.pathname`; itu sebabnya alamatnya dioper PROP, bukan dibaca di dalam tampilan.
  const pathname = usePathname()

  return (
    <ErrorFallbackView
      error={error}
      reset={reset}
      area="publik"
      routePath={pathname}
    />
  )
}
