'use client'

// app/dashboard/vendor/page.tsx
// Halaman utama Dashboard Vendor — Sprint 3
//
// Saat ini: placeholder konfirmasi login berhasil + tombol logout
// Sprint 3: akan diisi dengan fitur Vendor Store, order list, dll.
//
// Teks halaman dibaca dari message_library (vendor_ui):
//   - vendor_page_title    → judul halaman
//   - vendor_page_subtitle → teks placeholder Sprint 3
//   - header_logout_label  → teks tombol logout
//   - header_logout_loading → teks saat proses logout
//
// Layout sudah verifikasi JWT dan role === 'VENDOR'
// Page ini tidak perlu verifikasi ulang.

import { useState, useEffect }           from 'react'
import { performLogout }                 from '@/lib/auth'

// Default teks sebagai fallback jika message_library belum termuat
const DEFAULT_MSG: Record<string, string> = {
  vendor_page_title:    'Dashboard Vendor',
  vendor_page_subtitle: 'Login berhasil. Fitur Vendor Store akan tersedia di Sprint 3.',
  header_logout_label:  'Logout',
  header_logout_loading:'Keluar...',
}

export default function VendorPage() {
  const [msg,     setMsg]     = useState<Record<string, string>>(DEFAULT_MSG)
  const [loading, setLoading] = useState(false)

  // Muat teks dari message_library — vendor_ui + header_ui
  useEffect(() => {
    fetch('/api/message-library?kategori=vendor_ui,header_ui')
      .then(res => res.json())
      .then(json => { if (json.success && json.data) setMsg(prev => ({ ...prev, ...json.data })) })
      .catch(() => { /* tetap pakai default */ })
  }, [])

  async function handleLogout() {
    setLoading(true)
    await performLogout()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center">
      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-green-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
          />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">
        {msg['vendor_page_title']}
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        {msg['vendor_page_subtitle']}
      </p>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="text-sm text-red-500 hover:text-red-700 underline disabled:opacity-50"
      >
        {loading ? msg['header_logout_loading'] : msg['header_logout_label']}
      </button>
    </div>
  )
}
