// lib/types/lapor-gangguan.type.ts
// Tipe BERSAMA jalur laporan gangguan — dipakai SERVER (pembaca message_library) dan KLIEN
// (tombol + Pop Up). Berkas ini SENGAJA netral: nol impor, nol efek samping, nol `server-only`.
//
// Dibuat: Sesi #428 — LANGKAH 1 bagian D K-424-5 (dua Pop Up).
//
// KENAPA TIPE PUNYA BERKAS SENDIRI, bukan menumpang di `lib/maintenance-teks.ts`:
//   Berkas pembaca teks ber-`import 'server-only'`. Paket itu MELEMPAR begitu modulnya ikut
//   terbawa ke bundel Client Component. `import type` memang dihapus TypeScript saat kompilasi,
//   jadi secara teori aman — tetapi menggantungkan keselamatan halaman PUBLIK pada penghapusan
//   tipe adalah taruhan yang tidak perlu: sesi berikutnya yang menambahkan SATU impor nilai
//   (bukan tipe) dari berkas yang sama akan meruntuhkan halaman maintenance, dan justru halaman
//   itulah yang muncul saat sistem sedang tidak sehat.
//   Pola yang sama dengan K-420-4: nilai server-only DIOPER PROP, tidak diimpor klien.

/**
 * Teks kedua Pop Up hasil pelaporan — SELURUHNYA dari `message_library` (ATURAN 8).
 * Nol hardcode: kalau salah satu key hilang, `getMessage()` mengembalikan nama key-nya
 * sehingga kerusakan LANGSUNG TERLIHAT di layar — gagal berisik, bukan gagal senyap.
 *
 * Pemetaan key (terverifikasi query live S#428, 9 dari 9 aktif, kategori `error_ui`, channel `ui`):
 *   judulTerkirim → `error_report_popup_title_sent`
 *   isiTerkirim   → `error_report_success`
 *   judulDitahan  → `error_report_popup_title_waiting`
 *   isiDitahan    → `error_report_already_sent`
 *   labelKode     → `error_report_kode_label`
 *   tombolTutup   → `error_report_close_button`
 */
export interface TeksPopUpLaporan {
  /** Judul Pop Up 1 — laporan melahirkan baris baru */
  judulTerkirim: string
  /** Isi Pop Up 1 */
  isiTerkirim:   string
  /** Judul Pop Up 2 — laporan DITAHAN (profil sama + halaman sama) */
  judulDitahan:  string
  /** Isi Pop Up 2 */
  isiDitahan:    string
  /** Label kotak kode laporan. Revisi Philips K-425-4: cukup "Kode laporan Anda", tanpa kalimat konteks. */
  labelKode:     string
  /** Label tombol penutup. Pop Up ditutup TOMBOL, bukan waktu (K-425-1). */
  tombolTutup:   string
}

/**
 * Seluruh teks tombol lapor + Pop Up-nya.
 *
 * ⚠️ `sukses` yang dulu berdiri sendiri SUDAH TIDAK ADA di sini — teks itu kini menjadi
 * `popUp.isiTerkirim`. Sejak K-425-1 hasil sukses TIDAK lagi tampil sebagai baris teks di
 * halaman, melainkan sebagai kotak Pop Up. Menyimpan dua salinan teks yang sama akan
 * melahirkan drift persis kelas `TEMUAN-NORMALISASI-WA-EMPAT-RUMAH` (S#424).
 */
export interface TeksLaporGangguan {
  /** Label tombol saat siap — `error_report_button` */
  tombol:   string
  /** Label tombol saat permintaan sedang berjalan — `error_report_sending` */
  mengirim: string
  /** Pesan gagal, tetap tampil INLINE (bukan Pop Up) — `error_report_failed` */
  gagal:    string
  /** Teks kedua Pop Up */
  popUp:    TeksPopUpLaporan
}
