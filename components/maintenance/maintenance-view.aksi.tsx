// components/maintenance/maintenance-view.aksi.tsx
// AKSI PENGGUNA di halaman Maintenance / halaman error — tombol lapor, tombol Coba Lagi, dan
// riwayat kanal kontak yang pernah berdiri di sini. Dipecah dari `MaintenanceView.tsx`, S#439.
//
// SUMBU PECAH = ALASAN BERUBAH (ATURAN 50.5): berkas INI berubah kalau AKSI pengguna berubah,
//   induknya kalau TATA LETAK berubah. Bukti: seluruh riwayat di bawah (mailto: S#424 · WhatsApp
//   S#433 · routePath S#429 · area S#435) milik blok ini, nol menyentuh tata letak.
// SEBAB DIUKUR: induk 7.849 B = 76,7%; dua prop saja → 8.073 B = 78,8%, dan tombol Coba Lagi
//   menembus ambang tindakan 80% (8.192 B, K-429-1). Terlewat oleh pekerjaan S#439 sendiri ⇒
//   dibersihkan di S#439 juga (preseden S#430 E · S#435). Disodorkan lebih dulu, disetujui Philips.
//
// PEMINDAHAN MEKANIS dari salinan SEGAR (7.849 B, SHA-256 4b17daaa1dee09ee…b972e6ba). Batas blok
//   DIHITUNG PROGRAM: baris 62-135 = 74 baris = 4.496 B; rekonstruksi `atas + blok + bawah` diuji
//   BYTE-IDENTIK dengan asal LEBIH DULU.
//   ⛔ Yang berubah DI DALAM blok — dicetak apa adanya, bukan diklaim verbatim begitu saja:
//        `namaHalaman={data.title}` → `namaHalaman={namaHalaman ?? data.title}`  (1 diganti)
//        `digest={digest}`                                                       (1 baru)
//      72 baris sisanya byte-identik; NOL komentar dipangkas (K-426-2). Indentasi blok DIBIARKAN
//      apa adanya — merapikannya mengubah byte, dan byte yang berubah tidak bisa dibuktikan lagi.
//   Arsip: `_arsip/coding-history/sesi-439-resolver-nama-halaman/` · angka: `KERJA_SESI_439.md`.

import type { MaintenanceConfig } from '@/lib/maintenance'
import type { AreaLaporan }       from '@/lib/types/lapor-gangguan.type'
import { LaporGangguanButton }    from '@/components/maintenance/LaporGangguanButton'

interface MaintenanceViewAksiProps {
  data: MaintenanceConfig
  area: AreaLaporan
  /** Nama halaman yang RUSAK (§B1). Dioper HANYA `ErrorFallbackView`; halaman maintenance tidak
   *  mengopernya ⇒ tetap `data.title`, NOL perubahan perilaku di sana. */
  namaHalaman?: string | null
  /** `error.digest`. WAJIB sama dengan laporan otomatis: `insiden_key` = `{digest}::{route_path}`
   *  (`penanda-laporan.util`) ⇒ nilai berbeda melahirkan baris KEDUA di `app_error_log`. */
  digest?:      string | null
  /** Tombol Coba Lagi (§5.0.5 butir 4). Teks dari `message_library` `error_retry_button` —
   *  diverifikasi ADA + aktif di Supabase S#439; bukan diseed ulang, bukan dikarang di kode. */
  cobaLagi?: { teks: string; onKlik: () => void }
}

export function MaintenanceViewAksi({
  data, area, namaHalaman, digest = null, cobaLagi,
}: MaintenanceViewAksiProps) {
  return (
    <>
        {/*
          RIWAYAT KANAL DI HALAMAN INI — dua tautan pernah berdiri di sini, KEDUANYA SUDAH DICABUT.
          Blok ini DIPERBARUI S#433 supaya tidak menjadi penunjuk basi: komentar yang menjelaskan
          tautan yang sudah tidak ada akan menyesatkan sesi berikutnya (kelas ATURAN 50.3).

            · `mailto:` — DICABUT S#424 (T-424-4). Diuji di komputer Philips, jendela normal:
              payload sempurna tetapi Chrome berhenti `0 B transferred` karena nol handler
              `mailto:` terdaftar. Gagal SENYAP. Memajang jalur yang diketahui gagal = menjebak
              pengunjung. Ia juga REDUNDAN terhadap tombol lapor di bawah.
            · WhatsApp — DICABUT S#433 (K-432-4 + K-432-7). Alasan lengkapnya di komentar
              tepat di bawah blok tombol lapor.

          ⇒ SATU-SATUNYA kanal yang tersisa = TOMBOL LAPOR di bawah. Aturan §6.3 ("tidak ada ajakan
          menghubungi tanpa alamat di baliknya") kini dipikul tombol itu sendiri, BUKAN oleh dua
          tautan yang digerbangi terpisah seperti dulu.
        */}
        {/*
          AKSI UTAMA — S#424, keputusan Philips: support problem WAJIB lewat EMAIL demi audit trail
          + log history, supaya penyelesaian case tidak jadi subjektif karena kedekatan personal.
          Tombol ini mengirim lewat SERVER: laporan dicatat ke `app_error_log` LEBIH DULU, baru
          email dikirim ke kontak tim. Ia tidak menitipkan apa pun ke aplikasi email pengguna,
          sehingga tidak bisa gagal senyap seperti `mailto:` (terbukti T-424-4).

          Digerbangi `showContact` saja — SENGAJA tidak menunggu `mailtoHref`/`waHref`: laporan
          tetap masuk audit trail walau nol kontak dicentang.
        */}
        {/*
          S#429 — `routePath` TIDAK LAGI DIOPER (menutup `HUTANG-ROUTEPATH-HARDCODE`).
          Sebelumnya baris ini berbunyi `routePath="/"` HARFIAH, apa pun halaman yang sedang
          digerbangi. Karena `insiden_key` diturunkan dari `routePath`, SELURUH laporan jatuh ke
          satu insiden yang sama — sehingga kondisi "halaman berbeda", salah satu dari PERSIS DUA
          pelepas penahanan (K-424-5 poin 2), MUSTAHIL lahir.

          Sekarang prop itu OPSIONAL dan tombol membaca `window.location.pathname` sendiri di
          klien. Komponen ini server-only dan tidak pernah tahu alamat yang sedang tampil; menebak
          alamatnya di server justru yang melahirkan hutang tadi. Nol tebakan, nol prop baru.
        */}
        {/*
          S#435 — `area` TIDAK LAGI HARFIAH `"publik"` (menutup `TEMUAN-429-AREA-HARDCODE` #64).
          Nilainya datang dari `MaintenanceGate` yang membungkus permukaan ini, jadi laporan dari
          Dashboard Vendor tercatat `vendor` dan dari Dashboard AT tercatat `admin_tenant`.
          Ini kemunculan KEEMPAT pola `routePath`/`area` — tiga saudaranya sudah ditutup S#429
          (`HUTANG-ROUTEPATH-HARDCODE`) dan S#433 (`alamatHalaman: '/'` ikut mati bersama
          `maintenance-kontak.ts`). Pola yang sama, akar yang sama: komponen bersama menebak
          konteks pemanggilnya alih-alih menerimanya.
        */}
        {data.showContact && (
          <LaporGangguanButton
            namaHalaman={namaHalaman ?? data.title}
            area={area}
            digest={digest}
            teks={data.teksLapor}
          />
        )}

        {/*
          ⛔ KANAL WHATSAPP DICABUT — S#433, keputusan Philips K-432-4 (ditegaskan K-432-7).
          Blok tautan `wa.me` yang dulu berdiri di sini SUDAH DIBUANG. Pencabutan ini SADAR dan
          dicatat terbuka, bukan hilang diam-diam — ia MENCABUT SEBAGIAN K-424-1 (S#424: "WA =
          kanal KIRIM, email = kanal DOKUMENTASI").

          Philips, VERBATIM S#432: *"kalau ini jadi lama dan proses nya susah, lebih baik
          [tautan WA] dihapus saja, kita gunakan email saja."*

          ALASANNYA BUKAN SELERA — ia batas keras yang ditemukan pengujian S#432 sendiri:
          isi pesan WA MUSTAHIL disamakan dengan isi email, karena baris `IP` DILARANG masuk
          pesan WhatsApp. Pesan itu disusun di perangkat pengunjung dan ikut DIBACA pengunjung,
          sehingga menyertakan IP melanggar TC-04 — aturan yang lulus di sesi yang sama.

          ⚠️ JANGAN DIHIDUPKAN LAGI tanpa keputusan Philips yang baru. Menghidupkannya kembali
          berarti menghidupkan lagi masalah yang pencabutan ini selesaikan.

          Rumah catatan lengkapnya: `#70 TEMUAN-KANAL-WA-DICABUT` +
          `DESAIN_MAINTENANCE_DAN_KONTAK_TIM`.
        */}
        {/*
          COBA LAGI (S#439, §5.0.5 butir 4) — `reset()` bawaan Next.js me-render ulang segmen yang
          gagal, jadi kerusakan SESAAT bisa dilewati pengguna tanpa menunggu tim. Digerbangi
          KEBERADAAN PROPNYA, bukan `showContact` dan bukan posisi saklar: mencoba lagi bukan cara
          menghubungi tim.
        */}
        {cobaLagi && (
          <div className="mt-3">
            <button
              type="button"
              onClick={cobaLagi.onKlik}
              className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
            >
              {cobaLagi.teks}
            </button>
          </div>
        )}
    </>
  )
}
