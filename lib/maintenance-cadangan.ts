// lib/maintenance-cadangan.ts
// TEKS CADANGAN DI DALAM KODE untuk halaman Maintenance / halaman error — §5.0.6.
// Dipecah dari `lib/maintenance-klien.ts`, S#439. Isi blok dipindah MEKANIS, nol kata diketik ulang.
//
// KENAPA TEKS INI BOLEH HARDCODE — pengecualian SADAR terhadap ATURAN 8, dinyatakan terbuka:
//   Halaman ramah tidak boleh ikut rusak oleh kerusakan yang sedang ia tutupi. Isinya tersimpan di
//   Supabase; kalau yang rusak justru sambungan ke Supabase, membaca judulnya pun gagal dan
//   pengguna kembali melihat layar mesin — persis yang mau dihindari. Jaring terakhir tidak boleh
//   punya tali ke sesuatu yang mungkin sudah putus.
//
// KENAPA PUNYA BERKAS SENDIRI (ALASAN BERUBAH, ATURAN 50.5):
//   · berkas INI            → berubah kalau KALIMAT jaring terakhir berubah
//   · `maintenance-klien`   → berubah kalau ENDPOINT / bentuk responsnya berubah
//   Dan yang menentukan: `app/global-error.tsx` wajib berdiri tanpa ketergantungan ke pembaca
//   config sama sekali, tetapi tetap butuh teks di bawah. Rumah terpisah membuat itu mungkin
//   tanpa menarik satu byte pun jalur `fetch` ke dalam jaring terakhir.
//
// SENGAJA TANPA `server-only` dan tanpa `use client`: dipakai dari pohon Client Component.

import type { TeksLaporGangguan } from '@/lib/types/lapor-gangguan.type'

/**
 * Teks cadangan DI DALAM KODE — pengecualian sadar terhadap ATURAN 8, ditetapkan §5.0.6.
 * Dipakai HANYA bila isi dari panel SA gagal dibaca. Alasannya: jaring terakhir tidak boleh punya
 * tali ke sesuatu yang mungkin sudah putus — kalau yang rusak justru sambungan ke Supabase, membaca
 * judulnya pun gagal dan pengguna kembali melihat layar mesin, persis yang mau dihindari.
 */
export const MAINTENANCE_CADANGAN = {
  title:      'Sedang Dalam Perbaikan',
  body:       'Mohon maaf, halaman ini sedang kami perbaiki. Silakan coba beberapa saat lagi.',
  theme:      'terang',
  illustration: 'preset_wrench',
  etaPrefix:  'Perkiraan selesai:',
  /** Teks tombol Coba Lagi bila `message_library` tak terbaca — §5.0.6, sama seperti judul/pesan. */
  retryButton: 'Coba Lagi',
} as const

// Diekspor S#439 — `ErrorFallbackView` memakainya sebagai wajah cadangan; menyalin bentuknya ke
// sana akan melahirkan konstanta kosong KEDUA (ATURAN 36).
export const TEKS_LAPOR_KOSONG_KLIEN: TeksLaporGangguan = {
  tombol: '', mengirim: '', gagal: '',
  popUp: {
    judulTerkirim: '', isiTerkirim: '', judulDitahan: '',
    isiDitahan: '', labelKode: '', tombolTutup: '',
  },
}
