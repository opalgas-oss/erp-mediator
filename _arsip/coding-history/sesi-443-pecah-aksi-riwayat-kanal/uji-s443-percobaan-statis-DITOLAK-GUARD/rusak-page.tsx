// app/dashboard/superadmin/uji-s443/rusak/page.tsx
// HALAMAN UJI — SENGAJA RUSAK. Alat pembukti butir (a) · (b) · (d) §10.1 (K-436-3).
// Dibuat: Sesi #443.
//
// ⛔⛔ WAJIB DICABUT SESUDAH TC-MTC LULUS. Halaman uji yang tertinggal = hutang sesi berikutnya
//   (§10.1 VERBATIM). Berkas ini + tetangganya `../sehat/page.tsx` + folder `uji-s443/` dibuang
//   BERSAMA-SAMA, dalam satu commit, di sesi yang menutup #45.
//
// ALAMAT TERSEMBUNYI (§10.1): nol baris di `dashboard_menus`, nol tautan dari sidebar mana pun.
//   Satu-satunya cara sampai ke sini adalah mengetik alamatnya. Akibat yang DIRANCANG: resolver
//   §B1 jatuh ke langkah 5 dan memakai alamat mentah sebagai nama halaman — itu BENAR, bukan TC
//   gagal (kelas #77).
//
// ⛔ `dynamic = 'force-dynamic'` BUKAN hiasan — ia yang menjaga `npm run build` tetap HIJAU.
//   Tanpa baris itu Next.js mencoba MENYIAPKAN halaman ini saat build, lemparannya terjadi di
//   sana, dan BUILD-nya yang gagal — bukan halamannya. Yang mau diuji adalah kegagalan saat
//   PENGUNJUNG membuka halaman, jadi halaman ini wajib dirender per-permintaan.
//
// ⚠️ Lemparan dari SERVER Component (bukan klien) SENGAJA dipilih: hanya jalur ini yang membuat
//   Next.js menerbitkan `digest` — kolom yang menyambungkan layar pengguna dengan baris
//   `app_error_log` (§7). Konsekuensinya `pesan` akan KOSONG di mode produksi karena Next.js
//   menyembunyikan isi pesan error server; itu perilaku yang benar (§7), bukan kekurangan.

export const dynamic = 'force-dynamic'

export default function HalamanUjiRusak() {
  throw new Error('UJI S#443 — kerusakan disengaja untuk membuktikan §10.1 butir (a), (b), dan (d).')
}
