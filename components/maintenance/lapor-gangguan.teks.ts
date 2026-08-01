// components/maintenance/lapor-gangguan.teks.ts
// SUBSTITUSI TEKS DI KLIEN untuk Pop Up laporan gangguan. Satu-satunya isinya: mengganti
// placeholder `{kode_error}` dengan kode laporan yang baru diterima dari server.
//
// Lahir: Sesi #429 — pemecahan `LaporGangguanButton.tsx`. Alasan berubahnya BERBEDA dari komponen
//   maupun dari jalur data: berkas ini berubah kalau KONVENSI placeholder berubah. Konvensi itu
//   sudah pernah salah sekali (kurung GANDA vs TUNGGAL, koreksi T-423-5) — memberinya rumah
//   sendiri membuat titik perbaikannya tunggal, bukan tersebar di dalam komponen.
//   Komentar dipindah VERBATIM dari berkas asal (K-426-2).

import type { TeksLaporGangguan, TeksPopUpLaporan } from '@/lib/types/lapor-gangguan.type'

export function susunTeksPopUp(teks: TeksLaporGangguan, bugCode: string): TeksPopUpLaporan {
  // Kurung TUNGGAL — sama dengan interpolate() di lib/message-library.ts (koreksi T-423-5).
  //
  // JARING PENGAMAN, bukan jalur utama: sejak K-425-4 kode laporan punya kotak sendiri sehingga
  // `{kode_error}` tidak lagi ditempel di kalimat. Substitusi tetap dipertahankan supaya kalau
  // key itu suatu saat diisi ulang dengan placeholder lewat **Konten > Message Library**, yang
  // tampil di layar pengunjung bukan tulisan mentah `{kode_error}`.
  return {
    ...teks.popUp,
    isiTerkirim: teks.popUp.isiTerkirim.replace(/\{(\w+)\}/g, (_, k: string) =>
      k === 'kode_error' ? bugCode : `{${k}}`
    ),
  }
}
