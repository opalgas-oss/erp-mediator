// Halaman utama homepage — Server Component, merakit semua komponen
// metadata diekspor di sini agar Next.js bisa inject ke <head>
import type { Metadata } from 'next'
import HomepageClient from '@/components/homepage/HomepageClient'

// ⛔ S#437 — GERBANG MAINTENANCE DICABUT dari halaman ini, berikut `force-dynamic`-nya.
//   K-436-1 mengunci `maintenance_mode` sebagai saklar TAMPILAN di halaman yang GAGAL dibuka —
//   bukan saklar tutup situs. Homepage adalah halaman SEHAT, jadi ia TETAP NORMAL apa pun posisi
//   saklarnya. `force-dynamic` ikut dicabut karena satu-satunya alasannya (gerbang membaca
//   `config_registry` tiap permintaan, S#412) sudah hilang ⇒ halaman ini kembali Static.
//   Wajah ramah saat halaman rusak kini tugas `app/error.tsx`. Alasan lengkap: `KERJA_SESI_437`.

export const metadata: Metadata = {
  title: 'Mediator — Platform Jasa Terpercaya Indonesia',
  description: 'Pasang kebutuhan, mitra lokal bersaing memberikan penawaran terbaik.',
}

export default function Home() {
  return <HomepageClient />
}
