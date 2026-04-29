'use client'

// components/ConcurrentSessionBanner.tsx
// Banner informasi sesi paralel — ditampilkan di dashboard setelah login berhasil.
//
// Dibuat: Sesi #076 — I-05 implementasi
// Berdasarkan: Research_ConcurrentSession_Sesi074.md
//   - Tidak memblokir — hanya informasional (OWASP ASVS v4)
//   - Dismissible — user bisa tutup banner kapan saja
//   - Tidak ada fetch tambahan — data sudah disiapkan layout (RSC) via Promise.all
//
// Cara kerja performa:
//   - Layout (RSC) menjalankan cekSesiParalel() PARALLEL dengan query lain → 0 tambahan latency
//   - Jika adaSesi=false: banner tidak dirender sama sekali (null return)
//   - Jika adaSesi=true: banner muncul di bawah header, bisa di-dismiss

import { useState } from 'react'

// Tipe data sesi paralel — mirror dari HasilCekSesiParalel di login-session-check.ts
// Didefinisikan ulang di sini agar tidak ada runtime import dari 'use server' module
export interface SesiParalelData {
  device:   string
  gps_kota: string
  login_at: string | null
  role:     string
}

interface ConcurrentSessionBannerProps {
  sesiData: SesiParalelData
}

// Helper: format waktu login ke format WIB yang mudah dibaca
function formatWaktuLogin(login_at: string | null): string {
  if (!login_at) return 'beberapa saat lalu'
  try {
    const date = new Date(login_at)
    return date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day:      'numeric',
      month:    'short',
      hour:     '2-digit',
      minute:   '2-digit',
    })
  } catch {
    return 'beberapa saat lalu'
  }
}

export function ConcurrentSessionBanner({ sesiData }: ConcurrentSessionBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  // Jika sudah di-dismiss, tidak dirender sama sekali — lebih efisien dari hidden
  if (dismissed) return null

  const device  = sesiData.device   || 'perangkat lain'
  const kota    = sesiData.gps_kota || ''
  const waktu   = formatWaktuLogin(sesiData.login_at)
  const lokasi  = kota ? `${device} · ${kota}` : device

  return (
    <div
      role="alert"
      className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-sm"
    >
      {/* Ikon peringatan */}
      <svg
        className="w-4 h-4 text-amber-500 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>

      {/* Teks informasi */}
      <span className="flex-1 text-amber-800">
        Kamu juga sedang login di{' '}
        <span className="font-medium">{lokasi}</span>
        {' · '}sejak {waktu}.
      </span>

      {/* Tombol dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors"
        aria-label="Tutup peringatan"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}
