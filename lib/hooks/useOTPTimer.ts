// lib/hooks/useOTPTimer.ts
// Hook untuk countdown timer OTP — decrement setiap detik
//
// Dibuat: Sesi #049 — Step 5 TAHAP C refactor login/page.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useOTPTimer(initialSeconds: number = 60) {
  const [hitunganMundur, setHitunganMundur] = useState(initialSeconds)
  const [aktif, setAktif]                   = useState(false)

  // Start timer — dipanggil saat OTP dikirim
  const mulaiTimer = useCallback((detik?: number) => {
    setHitunganMundur(detik ?? initialSeconds)
    setAktif(true)
  }, [initialSeconds])

  // Reset timer — dipanggil saat pindah tahap
  const resetTimer = useCallback(() => {
    setHitunganMundur(0)
    setAktif(false)
  }, [])

  // Decrement setiap detik
  useEffect(() => {
    if (!aktif || hitunganMundur <= 0) {
      if (hitunganMundur <= 0) setAktif(false)
      return
    }
    const timer = setTimeout(() => {
      setHitunganMundur(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [aktif, hitunganMundur])

  return {
    hitunganMundur,
    bisaKirimUlang: !aktif || hitunganMundur <= 0,
    mulaiTimer,
    resetTimer,
  }
}
