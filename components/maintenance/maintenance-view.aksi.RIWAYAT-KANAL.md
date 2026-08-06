# maintenance-view.aksi.RIWAYAT-KANAL.md
# Riwayat PENCABUTAN di `components/maintenance/maintenance-view.aksi.tsx` — ERP Mediator Hyperlocal
# Lahir: Sesi #443 — 6 Agustus 2026, dari pemecahan `maintenance-view.aksi.tsx` 8.067 B = 78,8%
#   batas 10.240 B (sisa 125 B ke ambang 80%). Melunasi #78 `TD-439-1`.
#
# SUMBU PECAH = ALASAN BERUBAH, DIWARISI dari entri #78 (ATURAN 54.4) — bukan dikarang di sini:
#   riwayat PENCABUTAN berubah hanya kalau pencabutannya ditinjau ulang; dokumentasi aksi HIDUP
#   berubah tiap aksinya berubah. Blok "AKSI UTAMA S#424" SENGAJA TIDAK dipindah — tombol lapor
#   masih berdiri, jadi ia sisi HIDUP.
#
# ⛔ BUKAN ARSIP MATI. Empat blok di bawah memuat larangan yang MASIH BERLAKU — terutama §4
#   ("JANGAN DIHIDUPKAN LAGI"). Berkas ini duduk BERSEBELAHAN dengan kodenya, bukan di `_arsip/`,
#   supaya siapa pun yang menyunting berkas itu membacanya (ATURAN 50.3: alamat yang terbukti
#   memuat isinya, bukan alamat harapan).
#
# TEKS DI BAWAH VERBATIM, dipindah MEKANIS oleh program dari salinan byte-exact
#   (8.067 B, SHA-256 `5d99a0fb7778add126caaf5e80b93034f2784518c737d0939a0fc6376c77af22`).
#   NOL karakter melewati ketikan Claude. NOL komentar dipangkas (K-426-2). Indentasi asli
#   DIBIARKAN apa adanya — merapikannya mengubah byte, dan byte yang berubah tidak bisa
#   dibuktikan lagi.
# Arsip pra-pemecahan: `_arsip/coding-history/sesi-443-pecah-aksi-riwayat-kanal/`
#
# DIKERJAKAN SETELAH: components/maintenance/maintenance-view.aksi.tsx
# BLOCKER:            Tidak ada

---

## §1 — RIWAYAT KANAL DI HALAMAN INI — `mailto:` (S#424) + WhatsApp (S#433)

```tsx
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
```

## §2 — `routePath` TIDAK LAGI DIOPER — S#429, menutup `HUTANG-ROUTEPATH-HARDCODE`

```tsx
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
```

## §3 — `area` TIDAK LAGI HARFIAH `"publik"` — S#435, menutup `TEMUAN-429-AREA-HARDCODE` (#64)

```tsx
        {/*
          S#435 — `area` TIDAK LAGI HARFIAH `"publik"` (menutup `TEMUAN-429-AREA-HARDCODE` #64).
          Nilainya datang dari `MaintenanceGate` yang membungkus permukaan ini, jadi laporan dari
          Dashboard Vendor tercatat `vendor` dan dari Dashboard AT tercatat `admin_tenant`.
          Ini kemunculan KEEMPAT pola `routePath`/`area` — tiga saudaranya sudah ditutup S#429
          (`HUTANG-ROUTEPATH-HARDCODE`) dan S#433 (`alamatHalaman: '/'` ikut mati bersama
          `maintenance-kontak.ts`). Pola yang sama, akar yang sama: komponen bersama menebak
          konteks pemanggilnya alih-alih menerimanya.
        */}
```

## §4 — ⛔ KANAL WHATSAPP DICABUT — S#433, K-432-4 + K-432-7

```tsx
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
```

---

*maintenance-view.aksi.RIWAYAT-KANAL.md — lahir S#443, 6 Agustus 2026. Melunasi #78 `TD-439-1`.*
