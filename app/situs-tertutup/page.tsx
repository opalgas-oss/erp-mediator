// app/situs-tertutup/page.tsx
// WAJAH halaman "situs ditutup sementara" (#75) — Server Component, seluruh isi dari config.
//
// Dibuat Sesi #450 — butir 2 dari 6 (#75 HUTANG-SAKLAR-TUTUP-SITUS).
//
// ⛔ HALAMAN INI TIDAK MEMASANG GERBANG APA PUN.
//   Ia hanya WAJAH. Yang memutuskan siapa dibawa ke sini = `middleware.ts` (butir 3, T-449-10).
//   Memasang gerbang di halaman = bentuk yang S#437 bongkar dengan 8 commit. Jangan diulang.
//
// 🔴 KENAPA HALAMAN (`page.tsx`), BUKAN ROUTE HANDLER (`route.ts`) SEPERTI TERTULIS DI T-449-15
//   T-449-15 memilih jalan C: `middleware` → `rewrite` → Route Handler yang merender
//   `MaintenanceView` jadi HTML lalu memulangkan 503. Riset S#449 benar soal status HTTP-nya,
//   tetapi MELEWATKAN satu hal yang baru terlihat saat kodenya dibaca:
//
//     Route Handler memulangkan Response MENTAH. Next.js tidak menyisipkan apa pun ke dalamnya —
//     tidak `app/layout.tsx`, tidak font, dan TIDAK stylesheet Tailwind (yang alamatnya ber-hash
//     per-build: `/_next/static/css/<hash>.css`, tidak bisa ditebak dari dalam handler).
//     ⇒ Halaman tertutup akan tampil sebagai HTML TELANJANG tanpa satu pun gaya.
//
//   Menambalnya butuh stylesheet tulis-tangan khusus halaman ini = DUA wajah untuk satu tampilan,
//   persis kelas `TEMUAN-NORMALISASI-WA-EMPAT-RUMAH` yang ATURAN 19 sebut bug arsitektur — dan
//   justru itu yang jadi alasan jalan A ditolak.
//
//   ⇒ KEPUTUSAN TEKNIS CLAUDE S#450 (ATURAN 13 + 52.6 kolom TEKNIS), penyempurnaan T-449-15:
//     · WAJAH-nya = halaman Next biasa (berkas ini) ⇒ layout, font, dan Tailwind ikut apa adanya,
//       `MaintenanceView` dipakai ulang UTUH, NOL stylesheet kedua, NOL drift.
//     · STATUS 503 + `Retry-After` distempel `middleware.ts` (butir 3): ia mengambil HTML halaman
//       ini lewat satu permintaan internal, lalu memulangkannya kembali dengan status 503.
//   Kedua janji yang Philips setujui tetap utuh — K-436-5 (pakai ulang tampilan) DAN T-449-14
//   (status 503). Yang berubah hanya SIAPA yang menstempel statusnya.
//
// ⚠️ Dikunjungi LANGSUNG, halaman ini memulangkan 200 — ia memang halaman biasa. Karena itu ia
//   ditandai `noindex` di bawah, supaya tidak pernah masuk indeks mesin pencari lewat pintu itu.
//
// ⚠️ BUTIR 5 BELUM DIKERJAKAN — empat baris `site_closed*` di `config_registry` sengaja PALING
//   AKHIR (saklar tanpa konsumen = penyakit `HUTANG-LOOP-KONTAK`). Selama baris itu belum ada,
//   halaman ini jatuh ke nilai `maintenance_*` yang SUDAH hidup, jadi ia tetap tampil benar
//   sejak hari pertama. Rantai jatuhnya ditulis eksplisit di `bacaIsiSitusTertutup()`.

import type { Metadata }        from 'next'
import { getConfigPageItems }   from '@/lib/config-registry'
import { getMessage }           from '@/lib/message-library'
import { getMaintenanceConfig } from '@/lib/maintenance'
import type { MaintenanceConfig } from '@/lib/maintenance'
import { TEKS_LAPOR_KOSONG }    from '@/lib/maintenance-teks'
import { MaintenanceView }      from '@/components/maintenance/MaintenanceView'

// Isi dibaca per-permintaan: posisi & teks saklar boleh berubah kapan saja dari layar SA.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title:  'Situs Sedang Ditutup Sementara',
  robots: { index: false, follow: false },
}

/**
 * T-449-13 — TIGA LAPIS, dan ini penjelmaannya di kode:
 *   · kerangka tampilan  → `MaintenanceView`, dipakai bersama, NOL cabang per-permukaan
 *   · identitas visual   → `theme` + `illustration`, dipakai bersama dengan halaman maintenance
 *   · isi pesan          → `site_closed_title` / `site_closed_message` / `site_closed_eta`, TERPISAH
 * Itu sebabnya baris config barunya EMPAT, bukan delapan.
 */
async function bacaIsiSitusTertutup(): Promise<MaintenanceConfig> {
  // Dipakai ulang apa adanya — sumber `theme`, `illustration`, dan `etaPrefix`.
  // Pembacaannya sudah ber-cache (`getConfigPageItems`), jadi panggilan kedua di bawah tidak
  // menambah round-trip Supabase.
  const dasar = await getMaintenanceConfig()

  const rows = await getConfigPageItems('sistem')
  const map: Record<string, string> = {}
  for (const r of rows) {
    if (r.policy_key) map[r.policy_key] = r.nilai
  }

  // Rantai jatuh, ditulis eksplisit supaya tidak ada yang menebaknya:
  //   site_closed_* (butir 5, belum ada)  →  maintenance_* (sudah hidup hari ini)
  const judul = map['site_closed_title'] || dasar.title

  // Pola SAMA dengan `maintenance_message` (keputusan Philips S#412): config menyimpan KEY
  // message_library, teksnya diedit dari menu Pesan — bukan diketik ke config_registry.
  // ⚠️ Konsekuensinya untuk butir 5: selain 4 baris config, ia juga butuh SATU baris
  //    `message_library` untuk key pesannya. Dicatat di KERJA_SESI_450_KODE_75.md.
  const keyPesan = map['site_closed_message'] || ''
  const pesan    = keyPesan ? await getMessage(keyPesan, dasar.body) : dasar.body

  // 🔴 KOREKSI CLAUDE S#450 (giliran chat KESEPULUH) — versi sebelumnya berkas ini MEMAKSA
  //   `eta: ''` sebagai "perintah Philips menghapus Perkiraan selesai". ITU SALAH TAFSIR:
  //     · `maintenance_eta` HARI INI memang sudah KOSONG (dibaca dari Supabase S#450), dan
  //       `MaintenanceView` sudah menyembunyikan pil ETA saat kosong ⇒ barisnya MEMANG sudah
  //       tidak tampil. Yang Philips minta hapus adalah baris karangan di MOCKUP Claude, yang
  //       menampilkan nilai "Hari ini, 21.00 WIB" yang tidak pernah ada di sistem.
  //     · Memaksa `''` di kode = HARDCODE (ATURAN 10) dan MENCABUT kemampuan SA mengisinya dari
  //       layar selamanya — perubahan perilaku yang tidak pernah Philips minta.
  //   ⇒ DIKEMBALIKAN membaca config, PERSIS seperti halaman maintenance. Kalau SA membiarkannya
  //     kosong (keadaan hari ini), barisnya tidak tampil. Kalau suatu hari SA mengisinya, ia
  //     tampil — sama seperti halaman maintenance. NOL perbedaan perilaku.
  //   Alasan Philips tidak sanggup mengisi kolom ini secara manual TETAP TERCATAT sebagai
  //   hutang #83 (AI Agent Automation), dan itu memang bukan pekerjaan #75.
  const eta = map['site_closed_eta'] ?? dasar.eta

  return {
    ...dasar,
    on:    true,
    title: judul,
    body:  pesan,
    eta,

    // 🔴 SENGAJA DIMATIKAN — bukan kelalaian, dan bukan karena keterbatasan teknis.
    //   Tombol "Lapor" adalah isi halaman yang GAGAL. Di halaman yang SENGAJA ditutup, ia
    //   mengundang pengguna melaporkan sesuatu yang bukan gangguan — dan setiap laporan itu
    //   akan mengotori `app_error_log` dengan insiden yang tidak pernah terjadi.
    //   Dasar: T-449-15, dan riset T-449-13 yang menetapkan isi WAJIB halaman tertutup =
    //   perkiraan kapan kembali, bukan jalur pelaporan.
    showContact: false,
    teksLapor:   TEKS_LAPOR_KOSONG,
  }
}

export default async function SitusTertutupPage() {
  const data = await bacaIsiSitusTertutup()

  // `area` WAJIB dioper eksplisit — nilai bawaan sengaja tidak ada (#64 `TEMUAN-429-AREA-HARDCODE`).
  // `publik` benar di sini: halaman ini menggantikan permukaan PUBLIK dan seluruh dashboard,
  // dan satu-satunya pemakai `area` (tombol lapor) memang dimatikan di atas.
  return <MaintenanceView data={data} area="publik" />
}
