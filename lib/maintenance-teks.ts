// lib/maintenance-teks.ts
// Pembaca SATU-SATUNYA untuk teks tombol lapor + teks kedua Pop Up laporan gangguan.
// Sumber: `message_library` kategori `error_ui`, channel `ui`. NOL hardcode (ATURAN 8).
//
// Dibuat: Sesi #428 — LANGKAH 1 bagian D K-424-5 (dua Pop Up).
//
// KENAPA BERKAS INI LAHIR (sumbu pemecahan = TANGGUNG JAWAB, bukan ukuran):
//   `lib/maintenance.ts` sudah 9.615 B SEBELUM disentuh = 96,2% batas 10 KB untuk berkas kode
//   (CODING_RULES_AI ATURAN 9). Menambahkan 6 pembacaan teks Pop Up ke dalamnya PASTI melewati
//   batas. K-427-1 menyerahkan sumbu pemecahan ke Claude, dan K-426-2 melarang jalan pintas
//   "rampingkan komentarnya" — yang benar adalah MEMECAH.
//   Sumbunya bukan ukuran melainkan alasan berubah: `maintenance.ts` berubah saat KONFIGURASI
//   halaman berubah; berkas ini berubah saat TEKS berubah. Dua pemicu berbeda, dua rumah.
//
// ⚠️ PELAJARAN S#427 (TEMUAN-3) DITEGAKKAN: sesudah memecah, UKUR ULANG kedua sisi. Pecahan
//    pertama belum tentu cukup.

import 'server-only'
import { getMessage } from '@/lib/message-library'
import type { TeksLaporGangguan } from '@/lib/types/lapor-gangguan.type'

/**
 * Nilai kosong — dipakai saat blok lapor memang TIDAK dirender (maintenance mati, atau toggle
 * kontak mati). Bukan nilai bawaan yang menyamar jadi teks: kalau sampai tampil, kosongnya
 * kelihatan, dan itu memang yang diinginkan (tidak ada teks karangan kode).
 */
export const TEKS_LAPOR_KOSONG: TeksLaporGangguan = {
  tombol:   '',
  mengirim: '',
  gagal:    '',
  popUp: {
    judulTerkirim: '',
    isiTerkirim:   '',
    judulDitahan:  '',
    isiDitahan:    '',
    labelKode:     '',
    tombolTutup:   '',
  },
}

/**
 * Baca sembilan teks sekaligus dalam satu gelombang paralel.
 *
 * SENGAJA TANPA NILAI FALLBACK. Kesembilan key adalah baris NYATA di `message_library` —
 * diverifikasi query live S#428: 9 dari 9 aktif, kategori `error_ui`, channel `ui`. Kalau salah
 * satu dihapus lewat halaman **Konten > Message Library**, `getMessage()` mengembalikan NAMA
 * KEY-nya, sehingga kerusakan langsung terlihat di layar.
 *
 * Alasannya prinsip, bukan selera: ini fitur yang seluruh tujuannya MELAPORKAN KERUSAKAN.
 * Menambal teksnya dengan kalimat cadangan di dalam kode berarti fitur anti-bug-senyap
 * menyembunyikan bug-nya sendiri — kelas persis BUG-034 dan BUG-038.
 */
export async function bacaTeksLaporGangguan(): Promise<TeksLaporGangguan> {
  const [
    tombol,
    mengirim,
    gagal,
    judulTerkirim,
    isiTerkirim,
    judulDitahan,
    isiDitahan,
    labelKode,
    tombolTutup,
  ] = await Promise.all([
    getMessage('error_report_button'),
    getMessage('error_report_sending'),
    getMessage('error_report_failed'),
    getMessage('error_report_popup_title_sent'),
    getMessage('error_report_success'),
    getMessage('error_report_popup_title_waiting'),
    getMessage('error_report_already_sent'),
    getMessage('error_report_kode_label'),
    getMessage('error_report_close_button'),
  ])

  return {
    tombol,
    mengirim,
    gagal,
    popUp: {
      judulTerkirim,
      isiTerkirim,
      judulDitahan,
      isiDitahan,
      labelKode,
      tombolTutup,
    },
  }
}
