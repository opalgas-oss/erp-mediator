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

import { useState } from 'react'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export type AreaLaporan = 'publik' | 'super_admin' | 'admin_tenant' | 'vendor'

export interface LaporGangguanButtonProps {
  routePath:    string
  namaHalaman:  string | null
  area:         AreaLaporan
  /** `error.digest` — null di halaman maintenance (bukan halaman error) */
  digest?:      string | null
  pesan?:       string | null
  menuKey?:     string | null
  /** Teks dari message_library — dioper server (ATURAN 8) */
  teksTombol:   string
  teksMengirim: string
  /** Memuat `{kode_error}` — disubstitusi di sini setelah server membalas */
  teksSukses:   string
  teksGagal:    string
}

type Keadaan = 'siap' | 'mengirim' | 'sukses' | 'gagal'

export function LaporGangguanButton({
  routePath,
  namaHalaman,
  area,
  digest = null,
  pesan = null,
  menuKey = null,
  teksTombol,
  teksMengirim,
  teksSukses,
  teksGagal,
}: LaporGangguanButtonProps) {
  const [keadaan, setKeadaan] = useState<Keadaan>('siap')
  const [bugCode, setBugCode] = useState<string>('')

  async function kirim() {
    if (keadaan === 'mengirim' || keadaan === 'sukses') return
    setKeadaan('mengirim')

    try {
      const res = await fetch('/api/error-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ routePath, namaHalaman, menuKey, digest, pesan, area }),
      })

      const data = await res.json().catch(() => null)

      if (res.ok && data?.success) {
        setBugCode(String(data.bugCode ?? ''))
        setKeadaan('sukses')
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
  const pesanSukses = teksSukses.replace(/\{(\w+)\}/g, (_, k: string) =>
    k === 'kode_error' ? bugCode : `{${k}}`
  )

  if (keadaan === 'sukses') {
    return (
      <p className="mt-6 text-xs opacity-80" role="status" aria-live="polite">
        {pesanSukses}
      </p>
    )
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={kirim}
        disabled={keadaan === 'mengirim'}
        className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
      >
        {keadaan === 'mengirim' ? teksMengirim : teksTombol}
      </button>

      {keadaan === 'gagal' && (
        <p className="mt-2 text-xs opacity-80" role="status" aria-live="polite">
          {teksGagal}
        </p>
      )}
    </div>
  )
}
