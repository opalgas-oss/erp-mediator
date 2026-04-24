// lib/hooks/useGPS.ts
// Hook untuk GPS location — non-blocking, dengan config dari config_registry
//
// Dipakai oleh login flow. GPS diminta sekali saat mount.
// Jika ditolak/timeout → form tetap jalan (non-blocking sesuai config gps_mode).
//
// Dibuat: Sesi #049 — Step 5 TAHAP A refactor login/page.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { getGPSLocation } from '@/lib/session-client'

// ─── Tipe internal ───────────────────────────────────────────────────────────
export interface GPSData {
  lat:  number
  lng:  number
  kota: string
}

// ─── Tipe config yang dibutuhkan GPS ─────────────────────────────────────────
interface GPSConfig {
  gps_timeout_seconds:   string
  gps_cache_ttl_minutes: string
  gps_mode:              string
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useGPS(config: GPSConfig) {
  const [gps, setGps] = useState<GPSData | null>(null)
  const gpsRef         = useRef<GPSData | null>(null)
  const sudahDiminta   = useRef(false)

  // Minta GPS sekali saat mount — non-blocking
  useEffect(() => {
    if (sudahDiminta.current) return
    sudahDiminta.current = true

    const timeoutMs  = Number(config.gps_timeout_seconds   || '10') * 1000
    const cacheTtlMs = Number(config.gps_cache_ttl_minutes || '30') * 60 * 1000

    getGPSLocation({ timeoutMs, cacheTtlMs })
      .then(hasil => { setGps(hasil); gpsRef.current = hasil })
      .catch(() => { /* GPS ditolak/timeout — form tetap jalan */ })
  }, [config])

  // Retry GPS (dipanggil manual jika gps_mode = required dan GPS belum ada)
  async function retryGPS(): Promise<GPSData | null> {
    const timeoutMs  = Number(config.gps_timeout_seconds   || '10') * 1000
    const cacheTtlMs = Number(config.gps_cache_ttl_minutes || '30') * 60 * 1000
    try {
      const hasil = await getGPSLocation({ timeoutMs, cacheTtlMs })
      setGps(hasil)
      gpsRef.current = hasil
      return hasil
    } catch {
      return null
    }
  }

  return { gps, gpsRef, retryGPS }
}
