'use client'

// components/maintenance/LaporGangguanButton.tsx
// Tombol AKSI UTAMA pelaporan gangguan — mengirim laporan lewat SERVER, bukan lewat aplikasi
// email pengguna.
//
// Dibuat: Sesi #424 — FASE 3.6e jalur EMAIL.
//
// KENAPA KOMPONEN INI ADA (keputusan Philips S#424, verbatim):
//   *"untuk Support Problem hampir / sebagian besar tidak menggunakan komunikasi via WA, tapi harus
//    melalui Email. Karena keterkaitan dengan Audit Trail dan Log History Problem sebuah aplikasi
//    dan memastikan tidak ada penyelesaian case karena subjektif ke dekatan personal."*
//
// `mailto:` DIUJI NYATA dan gagal di komputer Philips (jendela normal, bukan Incognito): payload
// terbukti sempurna di tab Payload DevTools, tapi Chrome berhenti — `0 B transferred`, nol aplikasi
// terbuka, karena tidak ada handler `mailto:` terdaftar. Gagal SENYAP, nol umpan balik ke pengguna.
// Tombol ini menutup lubang itu: satu klik → server mencatat ke `app_error_log` DAN mengirim email.
//
// SEMUA TEKS dari `message_library` (ATURAN 8) — dioper PROP dari Server Component, karena
// `getMessage()` ber-`server-only` dan tidak boleh diimpor dari Client Component (pola K-420-4,
// sama seperti nama brand).
//
// Komponen ini SENGAJA dipakai ulang di halaman error dashboard (`ErrorFallbackView`) — bedanya
// hanya `digest` + `area` yang dioper. Nol duplikasi (ATURAN 19).

// S#428 — bagian D K-424-5: hasil pelaporan TIDAK lagi tampil sebagai baris teks di halaman,
// melainkan sebagai kotak Pop Up bertombol Tutup (K-425-1). Respons API `barisBaru` yang
// menentukan Pop Up mana yang muncul — lihat `kirim()` di bawah.

import { useState } from 'react'
import { PopUpLaporGangguan }      from '@/components/maintenance/PopUpLaporGangguan'
import type { VarianPopUpLaporan } from '@/components/maintenance/PopUpLaporGangguan'
import type { TeksLaporGangguan }  from '@/lib/types/lapor-gangguan.type'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export type AreaLaporan = 'publik' | 'super_admin' | 'admin_tenant' | 'vendor'

export interface LaporGangguanButtonProps {
  /**
   * Alamat halaman yang dilaporkan — dasar `insiden_key` di server.
   *
   * ⚠️ S#429 — OPSIONAL, sebelumnya WAJIB. `MaintenanceView` mengoper `routePath="/"` HARFIAH ke
   * sini apa pun halaman yang sedang digerbangi, sehingga SELURUH laporan jatuh ke satu
   * `insiden_key` dan kondisi "halaman berbeda" — salah satu dari PERSIS DUA pelepas penahanan
   * (K-424-5 poin 2) — MUSTAHIL lahir. Kalau prop ini tidak dioper, tombol membaca
   * `window.location.pathname` sendiri di klien: tempat yang sama dengan `alamatLengkap` sudah
   * dibaca sekarang. Nol tebakan server, nol prop baru.
   *
   * Tetap boleh dioper oleh pemanggil yang memang tahu alamat kanoniknya dan sengaja berbeda dari
   * alamat yang sedang tampil di layar.
   */
  routePath?:   string
  namaHalaman:  string | null
  area:         AreaLaporan
  /** `error.digest` — null di halaman maintenance (bukan halaman error) */
  digest?:      string | null
  pesan?:       string | null
  menuKey?:     string | null
  /**
   * Seluruh teks dari `message_library` — dioper PROP dari Server Component, karena
   * `getMessage()` ber-`server-only` dan tidak boleh diimpor Client Component (pola K-420-4).
   *
   * ⚠️ S#428: EMPAT prop string lama (`teksTombol` · `teksMengirim` · `teksSukses` · `teksGagal`)
   * DIGANTI satu objek. Sebabnya bagian D menambah enam teks Pop Up; meneruskan pola lama berarti
   * sepuluh prop string berjajar — urutan yang mudah tertukar tanpa ketahuan kompilator karena
   * semuanya bertipe sama. `teksSukses` kini hidup sebagai `teks.popUp.isiTerkirim`.
   */
  teks:         TeksLaporGangguan
}

/**
 * `selesai` menggantikan `sukses` (S#428): server punya DUA hasil yang sama-sama BERHASIL —
 * baris baru (Pop Up 1) dan laporan DITAHAN (Pop Up 2). Yang membedakan hanya Pop Up mana yang
 * tampil, dan itu disimpan terpisah di `varian`.
 */
type Keadaan = 'siap' | 'mengirim' | 'selesai' | 'gagal'

export function LaporGangguanButton({
  routePath,
  namaHalaman,
  area,
  digest = null,
  pesan = null,
  menuKey = null,
  teks,
}: LaporGangguanButtonProps) {
  const [keadaan, setKeadaan]           = useState<Keadaan>('siap')
  const [bugCode, setBugCode]           = useState<string>('')
  const [popUpTerbuka, setPopUpTerbuka] = useState(false)
  const [varian, setVarian]             = useState<VarianPopUpLaporan>('terkirim')

  async function kirim() {
    // Hanya permintaan yang SEDANG berjalan yang diblokir.
    // ⚠️ S#428 — pengguncian sesudah berhasil DICABUT. Sejak K-425-3, klik kedua pada profil DAN
    // halaman yang sama WAJIB memunculkan Pop Up 2; itu mustahil kalau tombolnya mati selamanya
    // sesudah klik pertama. Banjir dari satu sumber ditahan pembatas laju per-IP di route
    // (bagian B, S#427) — bukan oleh keadaan komponen yang gampang hilang saat halaman dimuat ulang.
    if (keadaan === 'mengirim') return
    setKeadaan('mengirim')

    try {
      // URL LENGKAP diambil di klien — hanya di sinilah host + query benar-benar diketahui.
      // Koreksi Philips S#424: tim Support butuh alamat yang bisa langsung dibuka, bukan `/`.
      // Dikirim TERPISAH dari `routePath` supaya dedup tidak pecah oleh query string.
      const alamatLengkap =
        typeof window !== 'undefined' ? window.location.href : null

      // ALAMAT HALAMAN (S#429) — dioper pemanggil kalau ada; kalau tidak, dibaca sendiri di klien.
      // Ini yang menutup `HUTANG-ROUTEPATH-HARDCODE`: nilainya kini mengikuti halaman yang benar-
      // benar dibuka, jadi komponen bersama ini otomatis benar di rumah keduanya nanti (halaman
      // error dashboard) tanpa satu baris pun diuji ulang di sana — itu inti DRY (ATURAN 19).
      const routePathFinal =
        routePath ?? (typeof window !== 'undefined' ? window.location.pathname : null)

      // GAGAL BERISIK, bukan gagal senyap (BUG-034 · BUG-038). DILARANG menambal dengan '/' —
      // nilai tambalan itulah yang justru melahirkan hutang ini.
      if (!routePathFinal) {
        console.error('[LaporGangguan] alamat halaman tidak terbaca — laporan dibatalkan')
        setKeadaan('gagal')
        return
      }

      const res = await fetch('/api/error-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          routePath: routePathFinal, alamatLengkap, namaHalaman, menuKey, digest, pesan, area,
        }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok && data?.success) {
        setBugCode(String(data.bugCode ?? ''))

        // `barisBaru` adalah SATU-SATUNYA penentu Pop Up mana yang tampil:
        //   true  ⇒ laporan melahirkan baris baru                    ⇒ Pop Up 1 (terkirim)
        //   false ⇒ PENAHANAN PER-PROFIL (profil sama + halaman sama) ⇒ Pop Up 2 (ditahan)
        // ⛔ TANPA batas waktu — waktu BUKAN pelepas penahanan (K-425-3).
        //
        // Nilai selain `true` sengaja jatuh ke 'ditahan': kalau server suatu saat berhenti
        // mengirim medan ini, yang muncul adalah Pop Up "sedang ditangani" — menahan diri lebih
        // aman daripada menjanjikan baris baru yang belum tentu ada.
        setVarian(data.barisBaru === true ? 'terkirim' : 'ditahan')
        setPopUpTerbuka(true)
        setKeadaan('selesai')
      } else {
        // Tidak ditelan diam-diam (BUG-034 · BUG-038) — pengguna diberi tahu, dan jejaknya
        // ada di konsol untuk penelusuran.
        console.error('[LaporGangguan] server menolak laporan:', data)
        setKeadaan('gagal')
      }
    } catch (err) {
      console.error('[LaporGangguan] permintaan gagal:', err)
      setKeadaan('gagal')
    }
  }

  // Kurung TUNGGAL — sama dengan interpolate() di lib/message-library.ts (koreksi T-423-5).
  //
  // JARING PENGAMAN, bukan jalur utama: sejak K-425-4 kode laporan punya kotak sendiri sehingga
  // `{kode_error}` tidak lagi ditempel di kalimat. Substitusi tetap dipertahankan supaya kalau
  // key itu suatu saat diisi ulang dengan placeholder lewat **Konten > Message Library**, yang
  // tampil di layar pengunjung bukan tulisan mentah `{kode_error}`.
  const teksPopUp = {
    ...teks.popUp,
    isiTerkirim: teks.popUp.isiTerkirim.replace(/\{(\w+)\}/g, (_, k: string) =>
      k === 'kode_error' ? bugCode : `{${k}}`
    ),
  }

  return (
    <>
      <div className="mt-6">
        <button
          type="button"
          onClick={kirim}
          disabled={keadaan === 'mengirim'}
          className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
        >
          {keadaan === 'mengirim' ? teks.mengirim : teks.tombol}
        </button>

        {/*
          Kegagalan tetap INLINE, sengaja BUKAN Pop Up. Pop Up dipakai untuk hasil yang BERHASIL
          dan membawa kode laporan yang perlu dicatat pengunjung. Kegagalan tidak membawa kode apa
          pun — menutupi halaman dengan kotak modal saat sistem sudah bermasalah hanya menambah
          satu lapis yang harus ditutup dulu sebelum pengunjung bisa mencoba kanal WhatsApp.
        */}
        {keadaan === 'gagal' && (
          <p className="mt-2 text-xs opacity-80" role="status" aria-live="polite">
            {teks.gagal}
          </p>
        )}
      </div>

      {/*
        Pop Up ditutup TOMBOL, bukan waktu (K-425-1). Sesudah ditutup, tombol lapor TETAP HIDUP:
        klik berikutnya pada halaman yang sama akan dijawab server dengan `barisBaru: false`
        sehingga Pop Up 2 yang muncul. Itu perilaku yang diminta K-425-3, bukan efek samping.
      */}
      <PopUpLaporGangguan
        terbuka={popUpTerbuka}
        varian={varian}
        kodeLaporan={bugCode}
        teks={teksPopUp}
        onTutup={() => setPopUpTerbuka(false)}
      />
    </>
  )
}
