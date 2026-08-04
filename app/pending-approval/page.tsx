// app/pending-approval/page.tsx
// Pembungkus SERVER halaman "menunggu persetujuan".
//
// ⛔ S#437 — GERBANG MAINTENANCE + `force-dynamic` DICABUT. K-436-1 mengunci `maintenance_mode`
//   sebagai saklar TAMPILAN di halaman yang GAGAL dibuka, bukan saklar tutup situs ⇒ halaman ini
//   yang SEHAT tetap terbuka apa pun posisi saklarnya. `force-dynamic` ikut dicabut karena
//   satu-satunya alasannya (gerbang membaca `config_registry` tiap permintaan) sudah hilang ⇒
//   halaman ini kembali **Static**. Wajah ramah saat halaman rusak kini tugas `app/error.tsx`.
//
// ❓ KENAPA PEMBUNGKUS INI TETAP ADA padahal gerbangnya sudah tidak ada — keputusan Philips S#437
//   (Opsi 1), dicatat supaya sesi berikutnya tidak "merapikannya" sendiri:
//   Isi halaman ini dipindah ke `components/pending-approval/PendingApprovalClient.tsx` di S#435
//   semata-mata agar gerbang ber-`server-only` bisa berdiri di atas isi ber-`'use client'` (halaman
//   ini memanggil `supabase.auth.signOut()` dan `useRouter()`). Mengembalikannya jadi satu berkas
//   berarti memindahkan isinya SEKALI LAGI demi hasil yang **nol terlihat di layar**. Bentuk
//   server-page + client-component ini pola normal Next.js, bukan kejanggalan. Penggabungan kembali
//   BOLEH dikerjakan nanti kalau Philips memintanya, dan paling murah SESUDAH TC halaman error lulus.
//
// Arsip byte-exact: S#435 (pra-pemindahan) `_arsip/coding-history/sesi-435-gerbang-maintenance/app/pending-approval/`
//                   S#437 (pra-pencabutan)  `_arsip/coding-history/sesi-437-bongkar-gerbang/app/pending-approval/`

import PendingApprovalClient from '@/components/pending-approval/PendingApprovalClient'

export default function PendingApprovalPage() {
  return <PendingApprovalClient />
}
