'use client'

// lib/hooks/useGpsInfo.ts
// Hook shared untuk membaca info GPS dari cookie browser.
// Dibuat: Sesi #079 — DRY refactor (BLOK B)
// Alasan: GPS logic identik di SidebarNav (SA) dan VendorSidebarNav — duplikasi WET code.
//
// Dipakai oleh:
//   - components/SidebarNav.tsx       (SA)
//   - components/VendorSidebarNav.tsx (Vendor)
//
// Cookie yang dibaca:
//   gps_kota          — nama kota dari GPS login
//   session_login_at  — timestamp login (ISO string) → diformat ke HH:mm WIB

import { useState, useEffect } from 'react'
import { getCookie }           from '@/lib/utils-client'

interface GpsInfo {
  kota:    string  // nama kota atau fallbackKota jika cookie kosong
  loginAt: string  // waktu login format HH:mm, atau '' jika tidak ada
}

/**
 * Hook untuk membaca informasi GPS dari cookie browser.
 * Mengembalikan kota dan waktu login yang sudah diformat.
 *
 * @param fallbackKota - Teks fallback jika cookie gps_kota kosong (dari message_library)
 * @returns GpsInfo { kota, loginAt }
 */
export function useGpsInfo(fallbackKota: string): GpsInfo {
  const [gpsInfo, setGpsInfo] = useState<GpsInfo>({ kota: '', loginAt: '' })

  useEffect(() => {
    const kota    = getCookie('gps_kota')
    const loginAt = getCookie('session_login_at')

    let waktu = ''
    if (loginAt) {
      try {
        waktu = new Date(loginAt).toLocaleTimeString('id-ID', {
          hour:   '2-digit',
          minute: '2-digit',
        })
      } catch { /* skip jika format timestamp tidak valid */ }
    }

    setGpsInfo({
      kota:    kota || fallbackKota,
      loginAt: waktu,
    })
  }, [fallbackKota])

  return gpsInfo
}
