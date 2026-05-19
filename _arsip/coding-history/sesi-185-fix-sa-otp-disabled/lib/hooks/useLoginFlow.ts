// ARSIP S#185 — sebelum fix SA OTP=disabled regresi
// Root cause: configLogin['require_otp_superadmin'] undefined → fallback 'required' → SA salah masuk OTP
// File asli: lib/hooks/useLoginFlow.ts
// Dibuat: 19 Mei 2026
// lib/hooks/useLoginFlow.ts
// Hook utama state machine login — state + orchestration.
//
// REFACTOR Sesi #055: API calls → loginApiCalls.ts; Session helpers → loginSessionHelpers.ts
// REFACTOR Sesi #062: Hapus Biometric dari login flow
// REFACTOR Sesi #068: loginUnifiedAction — 1 signInWithPassword semua role
// FIX Sesi #074: handle sesiParalelAda dari loginUnifiedAction
// FIX S#183a: tambah role eksplisit; fix 2 bypass path SA; refactor Vendor → lanjutSetelahRole
// FIX S#183d: handleLogin kondisi result.ok && result.uid (tanpa result.redirectTo)
// FIX S#183e: selesaiLogin hapus otp_pending cookie setelah OTP diverifikasi
//   loginUnifiedAction set otp_pending=1 untuk SA OTP=required
//   middleware Guard 5 baca cookie ini → redirect /login jika ada
//   selesaiLogin hapus cookie → dashboard bisa diakses setelah OTP verified

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams }               from 'next/navigation'
import { createBrowserSupabaseClient }              from '@/lib/supabase-client'
import { getGPSLocation }                           from '@/lib/session-client'
import { useOTPTimer }                              from '@/lib/hooks/useOTPTimer'
import { ROLES }                                    from '@/lib/constants'
import {
  DEFAULT_PESAN, SUPABASE_ERROR_KEYS,
  decodeJwtPayload, extractConfigItems, findConfigValue,
  parseRequireOtpForRole, getRequireOtpConfigKey,
} from '@/app/login/login-types'
import type { Tahap, DataSesiParalel } from '@/app/login/login-types'

import { loginUnifiedAction } from '@/app/login/actions'

import {
  fetchCheckLock, fetchLockAccount, fetchUnlockAccount,
  fetchCheckSession, fetchSendOTP, fetchVerifyOTP,
  fetchSessionLog, fetchUserPresence, fetchActivityLog,
  fetchLoadUserProfile,
} from './login/loginApiCalls'

import {
  ambilNamaSuperadmin, tulisSessionLogSuperadmin,
  aturCookieSession, hitungTujuanRedirect, kirimActivityLoginBerhasil,
} from './login/loginSessionHelpers'
import { SESSION_DEFAULT_TIMEOUT_MINUTES } from '@/lib/auth'

export interface LoginFlowState {
  tahap: Tahap
  email: string;          setEmail: (v: string) => void
  password: string;       setPassword: (v: string) => void
  tampilPassword: boolean
  errorEmail: string;     setErrorEmail: (v: string) => void
  errorPassword: string;  setErrorPassword: (v: string) => void
  isLoading: boolean
  error: string;          setError: (v: string) => void
  gpsKota: string | null
  akunDikunci: boolean
  waktuKunci: string
  sesiParalel: DataSesiParalel | null
  daftarRole: string[]
  roleDipilih: string;   setRoleDipilih: (v: string) => void
  otpInput: string;      setOtpInput: (v: string) => void
  otpPercobaan: number
  maxOtpPercobaan: number
  hitunganMundur: number
  handleLogin: () => Promise<void>
  handleVerifikasiOTP: () => Promise<void>
  handleKirimUlangOTP: () => Promise<void>
  handlePilihRole: () => Promise<void>
  handleKembaliDariSesiParalel: () => void
  togglePassword: () => void
  m: (key: string, vars?: Record<string, string>) => string
}

export function useLoginFlow(): LoginFlowState {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || ''

  const [tahap,          setTahap]          = useState<Tahap>('KREDENSIAL')
  const [gpsKota,        setGpsKota]        = useState<string | null>(null)
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [tampilPassword, setTampilPassword] = useState(false)
  const [errorEmail,     setErrorEmail]     = useState('')
  const [errorPassword,  setErrorPassword]  = useState('')
  const [isLoading,      setIsLoading]      = useState(false)
  const [error,          setError]          = useState('')
  const [uid,            setUid]            = useState('')
  const [tenantId,       setTenantId]       = useState('')
  const [userEmail,      setUserEmail]      = useState('')
  const [nama,           setNama]           = useState('')
  const [nomorWA,        setNomorWA]        = useState('')
  const [akunDikunci,    setAkunDikunci]    = useState(false)
  const [waktuKunci,     setWaktuKunci]     = useState('')
  const [sesiParalel,    setSesiParalel]    = useState<DataSesiParalel | null>(null)
  const [daftarRole,     setDaftarRole]     = useState<string[]>([])
  const [roleDipilih,    setRoleDipilih]    = useState('')
  const [otpInput,       setOtpInput]       = useState('')
  const [otpPercobaan,   setOtpPercobaan]   = useState(0)
  const [maxOtpPercobaan,setMaxOtpPercobaan]= useState(3)
  const [configLogin,    setConfigLogin]    = useState<Record<string, string>>({
    gps_timeout_seconds: '10', gps_cache_ttl_minutes: '30', gps_mode: 'true',
    password_min_length: '8', session_timeout_minutes: String(SESSION_DEFAULT_TIMEOUT_MINUTES), require_otp: 'true',
  })
  const [dbPesan, setDbPesan] = useState<Record<string, string>>({})

  const gpsRef         = useRef<{ lat: number; lng: number; kota: string } | null>(null)
  const gpsUdahDiminta = useRef(false)
  const otpTimer       = useOTPTimer(60)

  const m = useCallback((key: string, vars?: Record<string, string>): string => {
    const teks = dbPesan[key] ?? DEFAULT_PESAN[key] ?? key
    if (!vars) return teks
    return teks.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`)
  }, [dbPesan])

  useEffect(() => {
    fetch('/api/message-library?kategori=login_ui,otp_ui')
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setDbPesan(j.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (gpsUdahDiminta.current) return
    gpsUdahDiminta.current = true
    initConfigDanGPS()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function initConfigDanGPS() {
    let gpsTimeoutMs = 10_000, gpsCacheTtlMs = 30 * 60_000
    try {
      const res  = await fetch('/api/config/security_login')
      const data = await res.json()
      if (data.success && data.data) {
        const items = extractConfigItems(data.data)
        const map: Record<string, string> = {}
        for (const item of items) {
          if (item.policy_key && item.nilai !== undefined) map[item.policy_key] = item.nilai
        }
        if (Object.keys(map).length > 0) setConfigLogin(prev => ({ ...prev, ...map }))
        const t = Number(findConfigValue(items, 'gps_timeout_seconds'))
        const c = Number(findConfigValue(items, 'gps_cache_ttl_minutes'))
        if (t) gpsTimeoutMs  = t * 1000
        if (c) gpsCacheTtlMs = c * 60_000
      }
    } catch { /* pakai fallback */ }
    try {
      const hasil = await getGPSLocation({ timeoutMs: gpsTimeoutMs, cacheTtlMs: gpsCacheTtlMs })
      setGpsKota(hasil?.kota ?? null)
      gpsRef.current = hasil
    } catch { /* GPS ditolak — form tetap jalan */ }
  }

  // ... isi lengkap arsip sama dengan file asli di atas
}
