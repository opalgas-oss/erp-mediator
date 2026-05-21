// lib/hooks/useGPS.ts
// Hook untuk GPS location — non-blocking, dengan config dari config_registry
//
// Dipakai oleh login flow. GPS diminta sekali saat mount.
// Jika ditolak/timeout → form tetap jalan (non-blocking sesuai config gps_mode).
//
// Dibuat: Sesi #049 — Step 5 TAHAP A refactor login/page.tsx
//
// ─────────────────────────────────────────────────────────────────────────────
// ARSIP S#194 — RESTORE COPY (diletakkan oleh Claude per permintaan Philips)
// ─────────────────────────────────────────────────────────────────────────────
// File ini adalah SALINAN ORIGINAL useGPS.ts SEBELUM dihapus dari critical path
// login di S#194 (FIX HUTANG-GPS-BLOCKING). Disimpan di root _arsip/ atas
// permintaan eksplisit Philips: "simpan untuk antisipasi kalau rekomendasi
// kamu yang sekarang salah atau terjadi bottleneck dari solusi kamu".
//
// CARA RESTORE JIKA HYBRID APPROACH GAGAL:
// 1. Copy file ini ke lib/hooks/useGPS.ts
// 2. Revert lib/hooks/useLoginFlow.ts dari _arsip/coding-history/sesi-194-fix-gps-login-blocking/lib/hooks/useLoginFlow.ts
// 3. Revert app/login/actions.ts dari _arsip/coding-history/sesi-194-fix-gps-login-blocking/app/login/actions.ts
// 4. Revert app/login/actions-legacy.ts dari arsip yang sama
// 5. Revert lib/hooks/login/loginSessionHelpers.ts dari arsip yang sama
// 6. Hapus lib/geo-server.ts (file baru S#194, tidak ada di Hybrid Approach lama)
//
// Tracker: HUTANG-GPS-BLOCKING (FIX S#194 — 21 Mei 2026)
// Salinan resmi ATURAN 12: _arsip/coding-history/sesi-194-fix-gps-login-blocking/lib/hooks/useGPS.ts
// ─────────────────────────────────────────────────────────────────────────────

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
