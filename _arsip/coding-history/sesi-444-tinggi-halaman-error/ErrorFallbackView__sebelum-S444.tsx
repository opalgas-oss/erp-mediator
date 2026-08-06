'use client'

// components/error/ErrorFallbackView.tsx
// TAMPILAN BERSAMA halaman yang GAGAL DIBUKA — dipakai `app/error.tsx`, tiga `error.tsx` dashboard,
// dan `app/global-error.tsx`. Dibuat: Sesi #439, bagian B (§5.0 · §B1 · §B2).
//
// K-436-1 — MEKANISME YANG DIKUNCI, dan berkas inilah yang menjalankannya:
//   · halaman GAGAL + `maintenance_mode` AKTIF      ⇒ wajah Maintenance yang dirapikan SA
//   · halaman GAGAL + `maintenance_mode` TIDAK AKTIF ⇒ tampilan error mesin apa adanya
//   · halaman SEHAT                                  ⇒ berkas ini tidak pernah dipanggil sama sekali
//
// ⛔ PENCATATAN JALAN DI KEDUA POSISI SAKLAR (§5.0.5 + T-437-2). Saklar hanya memilih WAJAH, bukan
//   apakah gangguannya dicatat. Kalau pencatatan ikut mati saat saklar OFF, saklar itu berubah jadi
//   "matikan pelaporan error" — pintu bug-senyap yang §B2 larang, sekelas `catch {}` kosong yang
//   menyembunyikan BUG-034 dan BUG-038 berbulan-bulan.
//
// ⛔ SAAT MASIH MEMBACA, YANG TAMPIL ADALAH WAJAH RAMAH — bukan layar kosong dan bukan wajah mesin.
//   Bawaan `maintenance_mode` adalah AKTIF (K-436-2); menampilkan wajah mesin lebih dulu lalu
//   menggantinya berarti pengguna asli sempat melihat persis yang fitur ini ada untuk mencegah.
//
// NOL TAMPILAN BARU: seluruh wajah ramah dirender `MaintenanceView` yang sudah live sejak S#412.
// NOL TOMBOL LAPOR KEDUA: `LaporGangguanButton` yang sudah ada, dipakai lewat `MaintenanceView`.

import { useEffect, useRef, useState } from 'react'
import { MaintenanceView }             from '@/components/maintenance/MaintenanceView'
import { bacaMaintenanceConfigKlien }   from '@/lib/maintenance-klien'
// Teks cadangan diambil dari rumahnya sendiri (§5.0.6), BUKAN dari pembaca config — supaya wajah
// cadangan tidak ikut bergantung pada berkas yang tugasnya justru menyentuh jaringan.
import { MAINTENANCE_CADANGAN, TEKS_LAPOR_KOSONG_KLIEN } from '@/lib/maintenance-cadangan'
import { bacaNamaHalamanKlien }        from '@/lib/nama-halaman-klien'
import { kirimLaporanGangguan }        from '@/components/maintenance/lapor-gangguan.kirim'
import type { MaintenanceConfig }      from '@/lib/maintenance'
import type { AreaLaporan }            from '@/lib/types/lapor-gangguan.type'

export interface ErrorFallbackViewProps {
  /** Objek error dari Next.js. `digest` adalah penghubung ke log server (§7). */
  error: Error & { digest?: string }
  /** `reset()` bawaan Next.js — dipasang di tombol Coba Lagi (§5.0.5 butir 4). */
  reset: () => void
  /** Permukaan tempat halaman ini gagal. Kolom `app_error_log.area` NOT NULL. */
  area: AreaLaporan
  /**
   * Alamat halaman yang gagal. SENGAJA dioper pemanggil, tidak dibaca sendiri di sini:
   * `error.tsx` memakai `usePathname()`, sedangkan `global-error.tsx` WAJIB
   * `window.location.pathname` karena ia menggantikan root layout sehingga konteks router tidak
   * dijamin tersedia (§B1 langkah 1). Menebaknya di sini akan salah di salah satu dari keduanya.
   */
  routePath: string
}

/** Wajah ramah saat isi dari panel SA belum/gagal terbaca — §5.0.6, teks cadangan DI DALAM KODE. */
const CONFIG_CADANGAN: MaintenanceConfig = {
  on:           true,
  title:        MAINTENANCE_CADANGAN.title,
  body:         MAINTENANCE_CADANGAN.body,
  illustration: MAINTENANCE_CADANGAN.illustration,
  theme:        MAINTENANCE_CADANGAN.theme,
  eta:          '',
  showContact:  false,
  etaPrefix:    MAINTENANCE_CADANGAN.etaPrefix,
  teksLapor:    TEKS_LAPOR_KOSONG_KLIEN,
}

export function ErrorFallbackView({ error, reset, area, routePath }: ErrorFallbackViewProps) {
  const [config, setConfig]           = useState<MaintenanceConfig | null>(null)
  const [teksRetry, setTeksRetry]     = useState<string>(MAINTENANCE_CADANGAN.retryButton)
  const [namaHalaman, setNamaHalaman] = useState<string>(routePath)
  const [menuKey, setMenuKey]         = useState<string | null>(null)
  const sudahJalan                    = useRef(false)

  useEffect(() => {
    // React 19 menjalankan efek DUA KALI di mode pengembangan. Tanpa penjaga ini laporan otomatis
    // terkirim dua kali; yang kedua memang akan ditahan server, tetapi menambah bunyi yang tidak
    // perlu di `app_error_log`. Penjaganya di sini, bukan di server — server sudah punya tugasnya.
    if (sudahJalan.current) return
    sudahJalan.current = true

    let hidup = true

    ;(async () => {
      // Nama halaman DICARI DULU, baru laporan dikirim: baris `app_error_log` wajib lahir dengan
      // nama halaman yang benar sejak awal (§10.1 butir d). Keduanya tidak pernah melempar.
      const [hasilConfig, hasilNama] = await Promise.all([
        bacaMaintenanceConfigKlien(),
        bacaNamaHalamanKlien(routePath),
      ])

      if (!hidup) return
      setConfig(hasilConfig.config)
      setTeksRetry(hasilConfig.teks['error_retry_button'] || MAINTENANCE_CADANGAN.retryButton)
      setNamaHalaman(hasilNama.namaHalaman)
      setMenuKey(hasilNama.menuKey)

      // ── PENCATATAN OTOMATIS — §5.0.5 butir 1, di KEDUA posisi saklar ──────────
      // Tanpa menunggu pengguna menekan apa pun: tim tetap tahu walaupun penggunanya diam.
      // Jalur yang dipakai SAMA PERSIS dengan tombol lapor (`kirimLaporanGangguan` →
      // `POST /api/error-report`) — nol jalur pencatatan kedua dibuat (ATURAN 19).
      await kirimLaporanGangguan({
        routePath,
        namaHalaman: hasilNama.namaHalaman,
        area,
        digest:      error.digest ?? null,
        pesan:       error.message || null,
        menuKey:     hasilNama.menuKey,
      })
    })()

    return () => { hidup = false }
  }, [routePath, area, error])

  // ── WAJAH MESIN — saklar TIDAK AKTIF (K-436-1 baris ketiga) ──────────────────
  // Sengaja telanjang: nol tema, nol ilustrasi, nol tombol lapor, nol tombol Coba Lagi. §5.0.5
  // menyatakan butir 2-4 hanya muncul bersama wajah ramah. Teks di bawah HARDCODE dan itu BENAR:
  // ini bahasa mesin, bukan teks yang SA rapikan dari panel — memindahkannya ke `message_library`
  // justru membuat wajah mesin bergantung pada Supabase yang mungkin sedang jadi penyebab errornya.
  if (config && !config.on) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 font-mono text-sm">
        <div className="max-w-lg">
          <p>Application error: a client-side exception has occurred.</p>
          {error.digest && <p className="mt-2 opacity-70">Digest: {error.digest}</p>}
          {error.message && <p className="mt-2 opacity-70 break-words">{error.message}</p>}
          <p className="mt-2 opacity-70">Path: {routePath}</p>
        </div>
      </main>
    )
  }

  // ── WAJAH RAMAH — saklar AKTIF (bawaan) DAN selama config masih dibaca ───────
  return (
    <MaintenanceView
      data={config ?? CONFIG_CADANGAN}
      area={area}
      namaHalaman={namaHalaman}
      digest={error.digest ?? null}
      cobaLagi={{ teks: teksRetry, onKlik: reset }}
    />
  )
}
