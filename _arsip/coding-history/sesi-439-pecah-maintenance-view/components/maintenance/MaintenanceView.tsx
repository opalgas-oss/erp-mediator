// components/maintenance/MaintenanceView.tsx
// Tampilan halaman Maintenance publik — terang, ramah, beranimasi (acuan MOCKUP_sistem_v1.html).
// Server component murni (tanpa interaktivitas) — semua isi dari props (config sistem).
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA page `sistem`, consumer loop-tertutup (ATURAN 34).
// Ilustrasi: id preset (preset_*) → SVG bawaan app; selain itu dianggap URL (hasil upload SA ke Storage).

import type { MaintenanceConfig } from '@/lib/maintenance'
import type { AreaLaporan }       from '@/lib/types/lapor-gangguan.type'
import { LaporGangguanButton }    from '@/components/maintenance/LaporGangguanButton'


// ⚠️ DIPECAH Sesi #435 — TEMA + ILUSTRASI pindah ke `./maintenance-view.tampilan`.
//   Berkas ini sempat 9.750 B = 95,2% batas 10.240 B; ambang tindakan 80% (K-429-1). Sumbu pecah
//   = ALASAN BERUBAH: preset/tema di sana, tata letak di sini. Pemindahan mekanis dari salinan
//   byte-exact, nol komentar dipangkas (K-426-2). Alasan lengkap ada di kepala berkas tujuan.
import { THEME_CLASS, Illustration } from '@/components/maintenance/maintenance-view.tampilan'

/**
 * `area` WAJIB, sengaja TANPA nilai bawaan — S#435, menutup `TEMUAN-429-AREA-HARDCODE` (#64).
 *
 * Sebelum sesi ini komponen ini mengirim `area="publik"` HARFIAH ke tombol lapor. Selama gerbang
 * maintenance hanya terpasang di halaman publik, kekeliruan itu tidak terlihat. Begitu
 * `MaintenanceGate` memasang komponen yang SAMA di Dashboard Vendor dan AdminTenant, setiap
 * laporan dari kedua dashboard itu akan tercatat `area='publik'` di `app_error_log` — kolom NOT
 * NULL yang dipakai memilah laporan per permukaan.
 *
 * Nilai bawaan SENGAJA tidak diberikan: nilai bawaan adalah bentuk lain dari hardcode yang sama,
 * dan ia gagal SENYAP (data salah, layar normal). Tanpa bawaan, pemanggil yang lupa mengoper
 * `area` ditolak KOMPILATOR — gagal berisik di meja developer, bukan di tabel audit.
 */
// ⛔ S#437 — tipe `area` dilepas dari `lib/constants/maintenance.constant.ts`; berkas konstanta itu
//   dibongkar sesi ini (K-436-1: `maintenance_mode` = saklar TAMPILAN, bukan gerbang). `AreaGerbang`
//   di sana hanya alias murni `AreaLaporan` ⇒ tipe IDENTIK, NOL perubahan perilaku, hanya alamat
//   impor. Dilepas LEBIH DULU supaya berkas ini tidak ikut patah saat konstanta dibuang — kelas
//   `ENV_FALLBACK` (S#428) dan `setKeadaan` (S#429). Alasan lengkap: `KERJA_SESI_437`.
interface MaintenanceViewProps {
  data: MaintenanceConfig
  area: AreaLaporan
}

export function MaintenanceView({ data, area }: MaintenanceViewProps) {
  const themeClass = THEME_CLASS[data.theme] ?? THEME_CLASS.terang

  return (
    <main className={`min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 ${themeClass}`}>
      <div className="max-w-md text-center">
        <div className="mb-6 opacity-90">
          <Illustration illustration={data.illustration} />
        </div>

        <h1 className="text-2xl font-semibold mb-3">{data.title}</h1>

        <p className="text-sm leading-relaxed opacity-90 whitespace-pre-line">{data.body}</p>

        {data.eta && (
          <p className="mt-5 inline-block rounded-full bg-black/5 px-4 py-1.5 text-xs font-medium">
            {data.etaPrefix} {data.eta}
          </p>
        )}

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
            namaHalaman={data.title}
            area={area}
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
      </div>
    </main>
  )
}
