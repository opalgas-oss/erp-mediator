// lib/hooks/useLoginFlow.ts
// Hook utama state machine login — state + orchestration.
// UI components di app/login/components/ hanya render — tidak ada logic bisnis.
//
// REFACTOR Sesi #055:
//   API calls    → lib/hooks/login/loginApiCalls.ts
//   Session helpers → lib/hooks/login/loginSessionHelpers.ts
//   Hook ini = state declarations + orchestration saja.
//
// REFACTOR Sesi #058 LANGKAH 2:
//   handleLogin() coba loginSuperadminAction() dulu.
//   - SUPERADMIN sukses → action sudah handle semua → redirect
//   - role bukan SA (errorKey='NOT_SUPERADMIN') → fallback ke flow lama
//
// REFACTOR Sesi #060:
//   handleLogin() sekarang juga coba loginVendorAction() untuk role VENDOR.
//   - VENDOR sukses → action sudah set cookies + after() tasks
//   - Tapi Vendor masih perlu OTP — setelah action sukses, lanjut ke stage OTP
//   - role bukan SA dan bukan VENDOR → fallback ke flow lama (AdminTenant, Customer)
//
// FIX Sesi #061 — BUG-010:
//   Setelah loginVendorAction sukses, ambil tenantId + nomorWa dari action result
//   (bukan fetchLoadUserProfile(uid, null) yang salah — null membuat route
//   menganggap user sebagai SuperAdmin sehingga tenantId selalu kosong).

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams }               from 'next/navigation'
import { createBrowserSupabaseClient }              from '@/lib/supabase-client'
import { getGPSLocation }                           from '@/lib/session-client'
import { useBiometric }                             from '@/lib/hooks/useBiometric'
import { useOTPTimer }                              from '@/lib/hooks/useOTPTimer'
import { ROLES }                                    from '@/lib/constants'
import {
  DEFAULT_PESAN, SUPABASE_ERROR_KEYS,
  decodeJwtPayload, extractConfigItems, findConfigValue,
} from '@/app/login/login-types'
import type { Tahap, DataSesiParalel } from '@/app/login/login-types'

// Server actions — Sesi #058 (SA) + Sesi #060 (Vendor)
import { loginSuperadminAction, loginVendorAction } from '@/app/login/actions'

// API calls helpers
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

// ─── Return type hook ────────────────────────────────────────────────────────
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
  handleAktifkanBiometric: () => Promise<void>
  handleLewatiBiometric: () => Promise<void>
  handlePilihRole: () => Promise<void>
  handleKembaliDariSesiParalel: () => void
  togglePassword: () => void
  m: (key: string, vars?: Record<string, string>) => string
}

// ═════════════════════════════════════════════════════════════════════════════
// HOOK UTAMA
// ═════════════════════════════════════════════════════════════════════════════
export function useLoginFlow(): LoginFlowState {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || ''

  // ── State ─────────────────────────────────────────────────────────────────
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
    gps_timeout_seconds: '10', gps_cache_ttl_minutes: '30', gps_mode: 'required',
    password_min_length: '8', session_timeout_minutes: '480', require_otp: 'true',
  })
  const [dbPesan, setDbPesan] = useState<Record<string, string>>({})

  const gpsRef         = useRef<{ lat: number; lng: number; kota: string } | null>(null)
  const gpsUdahDiminta = useRef(false)
  const otpTimer       = useOTPTimer(60)
  const bio            = useBiometric()

  // ── Helper: baca pesan ────────────────────────────────────────────────────
  const m = useCallback((key: string, vars?: Record<string, string>): string => {
    const teks = dbPesan[key] ?? DEFAULT_PESAN[key] ?? key
    if (!vars) return teks
    return teks.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`)
  }, [dbPesan])

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

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

  function validasiForm(): boolean {
    let valid = true
    if (!email) { setErrorEmail(m('login_validasi_email_kosong')); valid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorEmail(m('login_validasi_email_format')); valid = false
    } else setErrorEmail('')

    const minPanjang = Number(configLogin['password_min_length'] || '8')
    if (!password) { setErrorPassword(m('login_validasi_password_kosong')); valid = false }
    else if (password.length < minPanjang) {
      setErrorPassword(m('login_validasi_password_min', { min_panjang: String(minPanjang) }))
      valid = false
    } else setErrorPassword('')
    return valid
  }

  async function pastikanGPS(): Promise<boolean> {
    const gpsMode = configLogin['gps_mode'] ?? 'required'
    if (gpsRef.current || gpsMode !== 'required') return true
    try {
      const timeoutMs  = Number(configLogin['gps_timeout_seconds']   || '10') * 1000
      const cacheTtlMs = Number(configLogin['gps_cache_ttl_minutes'] || '30') * 60_000
      const hasil = await getGPSLocation({ timeoutMs, cacheTtlMs })
      setGpsKota(hasil?.kota ?? null)
      gpsRef.current = hasil
      return true
    } catch { setError(m('login_error_gps_diperlukan')); return false }
  }

  async function cekKunciAkun(): Promise<{ dikunci: boolean; hadAttempts: boolean }> {
    try {
      const data = await fetchCheckLock({ email })
      if (data.locked) {
        setError(m('login_error_akun_dikunci', { lock_until_wib: data.lock_until_wib }))
        return { dikunci: true, hadAttempts: data.had_attempts === true }
      }
      return { dikunci: false, hadAttempts: data.had_attempts === true }
    } catch (err) {
      console.error('[login] check-lock gagal:', err)
      return { dikunci: false, hadAttempts: false }
    }
  }

  async function autentikasiSupabase() {
    const supabase = createBrowserSupabaseClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.session) throw new Error(authError?.message || 'Login gagal')
    return data
  }

  async function catatLockGagal(msg: string) {
    try {
      const data = await fetchLockAccount({ email, tenantId: tenantId || null })
      if (data.locked) {
        setError(m('login_error_akun_dikunci', { lock_until_wib: data.lock_until_wib }))
        setIsLoading(false)
        return true
      }
    } catch (err) { console.error('[login] lock-account gagal:', err) }

    const pesanKey = Object.entries(SUPABASE_ERROR_KEYS).find(
      ([key]) => msg.toLowerCase().includes(key.toLowerCase())
    )?.[1] ?? 'login_error_umum'
    setError(m(pesanKey))
    setIsLoading(false)
    return false
  }

  // Dipertahankan untuk fallback flow lama (AdminTenant, Customer)
  async function handleSuperadminLogin(
    authData:    { user: { id: string; email?: string | null }; session: { access_token: string } },
    hadAttempts: boolean,
  ) {
    const sessionTimeoutMinutes = Number(configLogin['session_timeout_minutes'] || '480')
    aturCookieSession({ roleDipilih: ROLES.SUPERADMIN, tenantId: '', gpsKota: gpsRef.current?.kota ?? null, sessionTimeoutMinutes })
    await tulisSessionLogSuperadmin(authData.user.id, gpsRef.current?.kota ?? '')
    const namaSA = await ambilNamaSuperadmin(authData.user.id)
    fetchUserPresence({ uid: authData.user.id, tenantId: null, nama: namaSA, role: ROLES.SUPERADMIN, currentPage: '/login', currentPageLabel: 'Halaman Login' }).catch(() => {})
    if (hadAttempts) fetchUnlockAccount({ uid: authData.user.id, tenantId: null, email, method: 'auto' })
    router.push('/dashboard/superadmin')
  }

  async function muatDataUser(uidUser: string, tid: string, claimRole: string) {
    try {
      const profile = await fetchLoadUserProfile(uidUser, tid)
      if (!profile.success) { setError(m('login_error_gagal_muat_data')); setTahap('KREDENSIAL'); setIsLoading(false); return }

      const vendorStatus    = (profile.status || '').toUpperCase()
      const blockedStatuses = (configLogin['vendor_blocked_statuses'] || 'PENDING,REVIEW')
        .split(',').map((s: string) => s.trim().toUpperCase())

      if (claimRole === ROLES.VENDOR && blockedStatuses.includes(vendorStatus)) {
        const supabase = createBrowserSupabaseClient()
        await supabase.auth.signOut()
        setError(m('login_error_akun_belum_aktif')); setTahap('KREDENSIAL'); setIsLoading(false); return
      }

      const namaUser    = profile.nama     || ''
      const nomorWAUser = profile.nomor_wa || ''
      let   roles       = profile.role ? [profile.role].filter(Boolean) : []
      if (roles.length === 0 && claimRole) roles = [claimRole]

      setNama(namaUser); setNomorWA(nomorWAUser); setDaftarRole(roles)

      if (roles.length === 1) {
        setRoleDipilih(roles[0])
        await lanjutSetelahRole(roles[0], tid, uidUser, namaUser, nomorWAUser)
      } else if (roles.length > 1) {
        setRoleDipilih(roles[0]); setTahap('ROLE'); setIsLoading(false)
      } else {
        setError(m('login_error_role_tidak_ditemukan')); setTahap('KREDENSIAL'); setIsLoading(false)
      }
    } catch {
      setError(m('login_error_gagal_muat_data')); setTahap('KREDENSIAL'); setIsLoading(false)
    }
  }

  async function lanjutSetelahRole(role: string, tid: string, uidUser: string, namaUser: string, waNumber: string) {
    try {
      const requireOtp = configLogin['require_otp'] === 'true'
      const isCustomer = role.toUpperCase() === ROLES.CUSTOMER
      if (!isCustomer && requireOtp) {
        await kirimOTP(uidUser, tid, role, waNumber, namaUser)
      } else {
        setTahap('BIOMETRIC'); setIsLoading(false)
      }
    } catch {
      setError(m('login_error_gagal_config')); setTahap('KREDENSIAL'); setIsLoading(false)
    }
  }

  async function kirimOTP(uidUser: string, tid: string, role: string, waNumber: string, namaUser: string) {
    setIsLoading(true); setError('')
    try {
      const resData = await fetchSendOTP({ uid: uidUser, tenantId: tid, role, nomorWa: waNumber, nama: namaUser })
      fetchActivityLog({ uid: uidUser, tenantId: tid, nama: namaUser, role, sessionId: '', actionType: 'API_CALL', module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', actionDetail: resData.success ? 'OTP berhasil dikirim' : 'OTP gagal dikirim', result: resData.success ? 'SUCCESS' : 'FAILED', gpsKota: gpsRef.current?.kota || '' })
      setMaxOtpPercobaan(resData.otp_max_attempts ?? 3)
      otpTimer.mulaiTimer(resData.resend_cooldown_seconds ?? 60)
      setOtpInput(''); setOtpPercobaan(0); setTahap('OTP')
    } catch (err) {
      console.error('[kirimOTP] error:', err)
      setError(m('otp_error_verifikasi_gagal'))
    } finally { setIsLoading(false) }
  }

  async function selesaiLogin() {
    setIsLoading(true); setTahap('SELESAI')
    try {
      const sessionTimeoutMinutes = Number(configLogin['session_timeout_minutes'] || '480')
      const slData    = await fetchSessionLog({ uid, tenantId: tenantId || null, role: roleDipilih, gpsKota: gpsRef.current?.kota ?? '' })
      const sessionId = slData.session_id ?? ''
      aturCookieSession({ roleDipilih, tenantId, gpsKota: gpsRef.current?.kota ?? null, sessionTimeoutMinutes })
      await fetchUserPresence({ uid, tenantId: tenantId || null, nama, role: roleDipilih, currentPage: '/login', currentPageLabel: 'Halaman Login' })
      kirimActivityLoginBerhasil(uid, tenantId, nama, roleDipilih, sessionId, gpsRef.current?.kota ?? null)
      router.push(hitungTujuanRedirect(roleDipilih, redirectTo))
    } catch {
      setError(m('login_error_gagal_selesaikan')); setTahap('KREDENSIAL'); setIsLoading(false)
    }
  }

  async function prosesSetelahAuthBerhasil(
    authData:    { user: { id: string; email?: string | null }; session: { access_token: string } },
    hadAttempts: boolean,
  ) {
    const claims        = decodeJwtPayload(authData.session.access_token)
    const claimRole     = claims['app_role']  as string || ''
    const claimTenantId = claims['tenant_id'] as string || ''

    if (claimRole === ROLES.SUPERADMIN) {
      await handleSuperadminLogin(authData, hadAttempts); return
    }

    if (!claimTenantId) {
      setError(m('login_error_config_belum_lengkap')); setIsLoading(false); return
    }

    setUid(authData.user.id); setUserEmail(authData.user.email || email); setTenantId(claimTenantId)
    if (hadAttempts) fetchUnlockAccount({ uid: authData.user.id, tenantId: claimTenantId, method: 'auto' })

    setTahap('LOADING')
    const dataSesi = await fetchCheckSession({ uid: authData.user.id, tenantId: claimTenantId })

    if (dataSesi.blocked) {
      setSesiParalel(dataSesi.sessionData || null); setTahap('SESI_PARALEL'); setIsLoading(false); return
    }

    await muatDataUser(authData.user.id, claimTenantId, claimRole)
  }

  async function runFlowLama() {
    const { dikunci, hadAttempts } = await cekKunciAkun()
    if (dikunci) { setIsLoading(false); return }
    try {
      const authData = await autentikasiSupabase()
      await prosesSetelahAuthBerhasil(authData, hadAttempts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      await catatLockGagal(msg)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  async function handleLogin() {
    if (!validasiForm()) return
    setIsLoading(true); setError('')
    if (!(await pastikanGPS())) { setIsLoading(false); return }

    // ─── Coba SA action dulu ──────────────────────────────────────────────────
    try {
      const resultSA = await loginSuperadminAction({
        email, password,
        device:  typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        gpsKota: gpsRef.current?.kota ?? '',
        redirectTo,
      })

      if (resultSA.ok && resultSA.redirectTo) {
        router.push(resultSA.redirectTo); return
      }

      if (resultSA.errorKey && resultSA.errorKey !== 'NOT_SUPERADMIN') {
        setError(m(resultSA.errorKey, resultSA.errorVars)); setIsLoading(false); return
      }
      // NOT_SUPERADMIN → lanjut cek Vendor
    } catch (err) {
      console.error('[handleLogin] SA action error:', err)
    }

    // ─── Coba Vendor action ───────────────────────────────────────────────────
    try {
      const resultVendor = await loginVendorAction({
        email, password,
        device:  typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        gpsKota: gpsRef.current?.kota ?? '',
        redirectTo,
      })

      if (resultVendor.ok && resultVendor.nama && resultVendor.uid) {
        // FIX BUG-010: ambil tenantId + nomorWa dari action result
        // Sebelumnya: fetchLoadUserProfile(uid, null) → null dianggap SA → tenantId kosong
        const tid = resultVendor.tenantId ?? ''
        const wa  = resultVendor.nomorWa  ?? ''

        setUid(resultVendor.uid)
        setNama(resultVendor.nama)
        setTenantId(tid)
        setNomorWA(wa)
        setRoleDipilih(ROLES.VENDOR)
        setUserEmail(email)

        const requireOtp = configLogin['require_otp'] === 'true'
        if (requireOtp) {
          await kirimOTP(resultVendor.uid, tid, ROLES.VENDOR, wa, resultVendor.nama)
        } else {
          setTahap('BIOMETRIC'); setIsLoading(false)
        }
        return
      }

      if (resultVendor.errorKey && resultVendor.errorKey !== 'NOT_VENDOR') {
        setError(m(resultVendor.errorKey, resultVendor.errorVars)); setIsLoading(false); return
      }
      // NOT_VENDOR → fallback ke flow lama
    } catch (err) {
      console.error('[handleLogin] Vendor action error:', err)
    }

    // ─── Flow lama — AdminTenant, Customer, atau fallback ────────────────────
    await runFlowLama()
  }

  async function handleVerifikasiOTP() {
    if (otpInput.length !== 6) { setError(m('otp_error_kurang_digit')); return }
    setIsLoading(true); setError('')
    try {
      const data = await fetchVerifyOTP({ uid, tenantId, inputCode: otpInput })
      if (data.success) {
        fetchActivityLog({ uid, tenantId, nama, role: roleDipilih, sessionId: '', actionType: 'FORM_SUBMIT', module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', actionDetail: 'Verifikasi OTP berhasil', result: 'SUCCESS', gpsKota: gpsRef.current?.kota || '' })
        setTahap('BIOMETRIC'); setIsLoading(false)
      } else if (data.result === 'EXPIRED') {
        setError(m('otp_error_kadaluarsa')); setIsLoading(false)
      } else {
        const baru = otpPercobaan + 1
        const sisa = maxOtpPercobaan - baru
        setOtpPercobaan(baru)
        setError(sisa <= 0 ? m('otp_error_batas_habis') : m('otp_error_salah', { sisa_percobaan: String(sisa) }))
        setIsLoading(false)
      }
    } catch { setError(m('otp_error_verifikasi_gagal')); setIsLoading(false) }
  }

  async function handleKirimUlangOTP() { await kirimOTP(uid, tenantId, roleDipilih, nomorWA, nama) }
  async function handleAktifkanBiometric() {
    setIsLoading(true); setError('')
    const verified = await bio.verify(uid, tenantId)
    if (verified) { await selesaiLogin(); return }
    await bio.register(uid, tenantId)
    await selesaiLogin()
  }
  async function handleLewatiBiometric() { await selesaiLogin() }
  async function handlePilihRole() { setIsLoading(true); setError(''); await lanjutSetelahRole(roleDipilih, tenantId, uid, nama, nomorWA) }
  function handleKembaliDariSesiParalel() { setTahap('KREDENSIAL'); setError('') }
  function togglePassword() { setTampilPassword(prev => !prev) }

  return {
    tahap,
    email, setEmail, password, setPassword, tampilPassword,
    errorEmail, setErrorEmail, errorPassword, setErrorPassword,
    isLoading, error, setError,
    gpsKota,
    akunDikunci, waktuKunci,
    sesiParalel,
    daftarRole, roleDipilih, setRoleDipilih,
    otpInput, setOtpInput, otpPercobaan, maxOtpPercobaan,
    hitunganMundur: otpTimer.hitunganMundur,
    handleLogin, handleVerifikasiOTP, handleKirimUlangOTP,
    handleAktifkanBiometric, handleLewatiBiometric,
    handlePilihRole, handleKembaliDariSesiParalel,
    togglePassword, m,
  }
}
