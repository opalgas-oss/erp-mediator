// lib/hooks/useLoginFlow.ts
// Hook utama state machine login — state + orchestration.
// UI components di app/login/components/ hanya render — tidak ada logic bisnis.
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
// FIX S#185: handleLogin — percaya result.redirectTo dari server sebagai indikator OTP=disabled
//   Bukan re-check configLogin['require_otp_superadmin'] yang undefined di login publik (RLS)
//   Regresi dari S#184 HUTANG-SA-CONFIG-SEPARATION
// FIX S#194: hapus getGPSLocation+Nominatim 781ms blocking dari critical path login
//   Server membaca x-vercel-ip-city via getGeoForAudit() di loginUnifiedAction.
//   Client tidak lagi minta permission GPS, tidak call Nominatim, tidak pass gpsKota.
//   Sidebar dashboard tetap tampil kota karena server set 'gps_kota' cookie:
//     - OTP=disabled → via setCookiesLoginServer di login-action-helpers.ts
//     - OTP=required → via cookieStore.set('gps_kota', ...) di actions.ts
//   Tampilan "📍 kota" di form login HILANG (acceptable — info di sidebar dashboard).

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams }               from 'next/navigation'
import { createBrowserSupabaseClient }              from '@/lib/supabase-client'
import { useOTPTimer }                              from '@/lib/hooks/useOTPTimer'
import { ROLES }                                    from '@/lib/constants'
import {
  DEFAULT_PESAN, SUPABASE_ERROR_KEYS,
  decodeJwtPayload, extractConfigItems,
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

  const [tahap,          setTahap]          = useState<Tahap>('KREDENSIAL')
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
  const [otpExpiryMenit, setOtpExpiryMenit] = useState(5)
  const [configLogin,    setConfigLogin]    = useState<Record<string, string>>({
    password_min_length: '8', session_timeout_minutes: String(SESSION_DEFAULT_TIMEOUT_MINUTES), require_otp: 'true',
  })
  const [dbPesan, setDbPesan] = useState<Record<string, string>>({})

  const initSudahJalan = useRef(false)
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
    if (initSudahJalan.current) return
    initSudahJalan.current = true
    initConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // FIX S#194: rename dari initConfigDanGPS — GPS dipindah ke server (Vercel header via getGeoForAudit).
  // Fungsi ini sekarang HANYA fetch config security_login untuk session_timeout, password_min_length, dll.
  async function initConfig() {
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
      }
    } catch { /* pakai fallback default state */ }
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

  // FIX S#194: pastikanGPS() dihapus — GPS tidak lagi blocking critical path login.
  // Server membaca x-vercel-ip-city header via getGeoForAudit() di loginUnifiedAction.

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

  async function handleSuperadminLogin(
    authData:    { user: { id: string; email?: string | null }; session: { access_token: string } },
    hadAttempts: boolean,
  ) {
    const sessionTimeoutMinutes = Number(configLogin['session_timeout_minutes'] || String(SESSION_DEFAULT_TIMEOUT_MINUTES))
    // FIX S#194: gpsKota null — server sudah set 'gps_kota' cookie di setCookiesLoginServer
    aturCookieSession({ roleDipilih: ROLES.SUPERADMIN, tenantId: '', gpsKota: null, sessionTimeoutMinutes })
    await tulisSessionLogSuperadmin(authData.user.id, '')
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

  // ─── lanjutSetelahRole — SINGLE SOURCE OF TRUTH OTP enforcement ──────────
  async function lanjutSetelahRole(role: string, tid: string, uidUser: string, namaUser: string, waNumber: string) {
    try {
      const otpMode = parseRequireOtpForRole(configLogin[getRequireOtpConfigKey(role)] ?? 'required', role)
      if (otpMode === 'disabled') {
        await selesaiLogin(uidUser, tid, role)
      } else {
        await kirimOTP(uidUser, tid, role, waNumber, namaUser)
      }
    } catch {
      setError(m('login_error_gagal_config')); setTahap('KREDENSIAL'); setIsLoading(false)
    }
  }

  async function kirimOTP(uidUser: string, tid: string, role: string, waNumber: string, namaUser: string) {
    setIsLoading(true); setError('')
    try {
      const resData = await fetchSendOTP({ uid: uidUser, tenantId: tid, role, nomorWa: waNumber, email, nama: namaUser })

      if (resData.otp_skipped) {
        fetchActivityLog({ uid: uidUser, tenantId: tid, nama: namaUser, role, sessionId: '', actionType: 'API_CALL', module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', actionDetail: 'OTP dilewati (mode config SA)', result: 'SUCCESS', gpsKota: '' })
        await selesaiLogin(uidUser, tid, role)
        return
      }

      // FIX S#205 — BUG-019 client handling:
      //   Server return success=false saat resend counter ≥ max_otp_resend.
      //   Sebelumnya client tidak check ini — user tetap masuk OTP stage dengan kode lama.
      //   Sekarang: tampilkan pesan dari server (yang sudah di-load dari message_library di otp.service.ts),
      //   jangan masuk OTP stage, jangan reset timer.
      // FIX S#206 — errorCode handling:
      //   - 'MAX_ATTEMPTS' → user MAX state → kembali ke form login dengan pesan tunggu
      //   - 'RESEND_LIMIT' → user di OTP stage saat resend gagal → tetap di stage saat ini
      if (!resData.success) {
        fetchActivityLog({ uid: uidUser, tenantId: tid, nama: namaUser, role, sessionId: '', actionType: 'API_CALL', module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', actionDetail: `Send OTP gagal: ${resData.errorCode ?? resData.message ?? 'unknown'}`, result: 'FAILED', gpsKota: '' })
        // Pesan datang dari server (sudah load dari message_library + interpolated — SA bisa edit via dashboard).
        setError(resData.message ?? m('otp_error_verifikasi_gagal'))
        // MAX_ATTEMPTS → keluar dari OTP flow, kembali ke form login
        if (resData.errorCode === 'MAX_ATTEMPTS') {
          setTahap('KREDENSIAL')
        }
        // RESEND_LIMIT atau error lain → tetap di stage saat ini
        return
      }

      fetchActivityLog({ uid: uidUser, tenantId: tid, nama: namaUser, role, sessionId: '', actionType: 'API_CALL', module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', actionDetail: 'OTP berhasil dikirim', result: 'SUCCESS', gpsKota: '' })
      setMaxOtpPercobaan(resData.otp_max_attempts ?? 3)
      setOtpExpiryMenit(resData.otp_expiry_minutes ?? 5)
      otpTimer.mulaiTimer(resData.resend_cooldown_seconds ?? 60)
      // Opsi A (keputusan Philips S#206): attempt counter PERSIST saat resend.
      // Sesuai spec asli Bug_Sesi_085.md BUG-017: "jangan setOtpPercobaan(0)".
      // Counter client TIDAK di-reset agar sisa percobaan konsisten dengan server.
      setOtpInput(''); setTahap('OTP')
    } catch (err) {
      console.error('[kirimOTP] error:', err)
      setError(m('otp_error_verifikasi_gagal'))
    } finally { setIsLoading(false) }
  }

  async function selesaiLogin(
    overrideUid?: string,
    overrideTenantId?: string,
    overrideRole?: string,
  ) {
    const aktualUid      = overrideUid      !== undefined ? overrideUid      : uid
    const aktualTenantId = overrideTenantId !== undefined ? overrideTenantId : tenantId
    const aktualRole     = overrideRole     !== undefined ? overrideRole     : roleDipilih

    setIsLoading(true); setTahap('SELESAI')
    try {
      const sessionTimeoutMinutes = Number(configLogin['session_timeout_minutes'] || String(SESSION_DEFAULT_TIMEOUT_MINUTES))
      const sessionId = crypto.randomUUID()

      // Set session cookies (untuk SA OTP=required: ini PERTAMA KALI cookie di-set)
      // FIX S#194: gpsKota null — server sudah set 'gps_kota' cookie di actions.ts (OTP=required path)
      aturCookieSession({ roleDipilih: aktualRole, tenantId: aktualTenantId, gpsKota: null, sessionTimeoutMinutes })

      // FIX S#183e: hapus otp_pending cookie — middleware tidak akan blokir dashboard lagi
      // loginUnifiedAction set cookie ini untuk SA OTP=required
      // Setelah OTP diverifikasi dan selesaiLogin dipanggil, cookie harus dihapus
      document.cookie = 'otp_pending=; Max-Age=0; path=/; SameSite=Strict'

      fetchSessionLog({
        uid: aktualUid, tenantId: aktualTenantId || null, role: aktualRole,
        gpsKota: '', sessionId,
      }).catch(err => console.error('[selesaiLogin] session-log gagal:', err))

      fetchUserPresence({
        uid: aktualUid, tenantId: aktualTenantId || null, nama, role: aktualRole,
        currentPage: '/login', currentPageLabel: 'Halaman Login',
      }).catch(err => console.error('[selesaiLogin] user-presence gagal:', err))

      kirimActivityLoginBerhasil(aktualUid, aktualTenantId, nama, aktualRole, sessionId, null)

      router.push(hitungTujuanRedirect(aktualRole, redirectTo))
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
      const otpModeSA = parseRequireOtpForRole(configLogin[getRequireOtpConfigKey('super_admin')] ?? 'required', 'super_admin')
      if (otpModeSA === 'disabled') {
        await handleSuperadminLogin(authData, hadAttempts)
        return
      }
      setUid(authData.user.id); setUserEmail(authData.user.email || email)
      setTenantId(''); setRoleDipilih(ROLES.SUPERADMIN); setDaftarRole([ROLES.SUPERADMIN])
      if (hadAttempts) fetchUnlockAccount({ uid: authData.user.id, tenantId: null, method: 'auto' })
      setTahap('LOADING')
      const profile = await fetchLoadUserProfile(authData.user.id, null)
      const namaSA  = profile.success ? (profile.nama  ?? '') : ''
      const waSA    = profile.success ? (profile.nomor_wa ?? '') : ''
      setNama(namaSA); setNomorWA(waSA)
      await kirimOTP(authData.user.id, '', ROLES.SUPERADMIN, waSA, namaSA)
      return
    }

    if (!claimTenantId) {
      setError(m('login_error_config_belum_lengkap')); setIsLoading(false); return
    }

    setUid(authData.user.id); setUserEmail(authData.user.email || email); setTenantId(claimTenantId)
    if (hadAttempts) fetchUnlockAccount({ uid: authData.user.id, tenantId: claimTenantId, method: 'auto' })

    setTahap('LOADING')
    const dataSesi = await fetchCheckSession({ uid: authData.user.id, tenantId: claimTenantId, role: claimRole })

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
    // FIX S#194: pastikanGPS() dihapus — GPS tidak lagi blocking critical path login

    try {
      const result = await loginUnifiedAction({
        email, password,
        device:  typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        redirectTo,
      })

      // FIX S#183d: cukup result.ok && result.uid (SA OTP=required tidak punya redirectTo)
      if (result.ok && result.uid) {
        const roleFromResult = result.role
          ?? (result.tenantId === undefined ? ROLES.SUPERADMIN
              : result.nomorWa !== undefined ? ROLES.VENDOR : ROLES.ADMIN_TENANT)
        const tid = result.tenantId ?? ''
        const wa  = result.nomorWa  ?? ''

        // VENDOR: nomorWa ada di result → lanjutSetelahRole (single source of truth OTP)
        if (roleFromResult === ROLES.VENDOR) {
          setUid(result.uid); setNama(result.nama ?? ''); setTenantId(tid)
          setNomorWA(wa); setRoleDipilih(ROLES.VENDOR); setUserEmail(email)
          await lanjutSetelahRole(ROLES.VENDOR, tid, result.uid, result.nama ?? '', wa)
          return
        }

        // Percaya keputusan server untuk OTP enforcement (bukan re-check configLogin di client).
        // Kontrak server→client yang sudah ada di actions.ts:
        //   OTP=disabled → setCookiesLoginServer() sudah dipanggil → return { redirectTo, ... }
        //   OTP=required → setCookiesLoginServer() TIDAK dipanggil → return { uid, role } tanpa redirectTo
        //
        // FIX S#185 — Regresi dari S#184 HUTANG-SA-CONFIG-SEPARATION:
        //   S#184 pisah SA ke key 'require_otp_superadmin'. Key ini tidak ada di default
        //   state configLogin dan tidak ter-fetch di halaman login publik (RLS akses_baca=["superadmin"]).
        //   Akibat: configLogin['require_otp_superadmin'] = undefined → fallback 'required'
        //   → SA OTP=disabled tetap masuk OTP flow di client.
        if (result.redirectTo) {
          // FIX S#191 (Step 6): dengan redirect() di server (actions.ts), jalur OTP=disabled
          // tidak akan mencapai blok ini karena server langsung redirect sebelum return JSON.
          // Blok ini menjadi FALLBACK SAFETY untuk edge case error — JANGAN DIHAPUS.
          // Protect jika ada perubahan arsitektur future yang balikkan ke return { redirectTo }.
          router.push(result.redirectTo)
          return
        }

        // Tidak ada redirectTo → server putuskan OTP=required
        // SA: otp_pending sudah di-set server, session cookie belum di-set
        // Lanjut fetch profil → lanjutSetelahRole → kirimOTP
        setTahap('LOADING')
        const profile     = await fetchLoadUserProfile(result.uid, tid || null)
        const nomorWaUser = profile.success ? (profile.nomor_wa ?? '') : ''
        const namaUser    = result.nama ?? (profile.success ? (profile.nama ?? '') : '')
        setUid(result.uid); setNama(namaUser); setTenantId(tid)
        setNomorWA(nomorWaUser); setRoleDipilih(roleFromResult); setUserEmail(email)
        await lanjutSetelahRole(roleFromResult, tid, result.uid, namaUser, nomorWaUser)
        return
      }

      if (!result.ok && result.errorKey) {
        setError(m(result.errorKey, result.errorVars)); setIsLoading(false); return
      }
    } catch (err) {
      console.error('[handleLogin] unified action error — koneksi gagal:', err)
      setError(m('login_error_koneksi_gagal'))
      setIsLoading(false)
      return
    }

    // Fallback: Customer atau role tidak dikenal
    await runFlowLama()
  }

  async function handleVerifikasiOTP() {
    if (otpInput.length !== 6) { setError(m('otp_error_kurang_digit')); return }
    setIsLoading(true); setError('')
    try {
      const data = await fetchVerifyOTP({ uid, tenantId, inputCode: otpInput })
      if (data.success) {
        fetchActivityLog({ uid, tenantId, nama, role: roleDipilih, sessionId: '', actionType: 'FORM_SUBMIT', module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', actionDetail: 'Verifikasi OTP berhasil', result: 'SUCCESS', gpsKota: '' })
        await selesaiLogin()
      } else if (data.result === 'EXPIRED') {
        setError(m('otp_error_kadaluarsa')); setIsLoading(false)
      } else if (data.result === 'MAX_ATTEMPTS') {
        // FIX S#205 — BUG-018 client handling:
        //   Server tracking via Redis otp_attempts:{uid}:{tenantId} sudah ≥ max_otp_attempts.
        //   User TIDAK BOLEH coba lagi dengan OTP yang sama.
        //   Set otpPercobaan = maxOtpPercobaan supaya UI yang depend on sisa juga tahu.
        //   User BISA klik Kirim ulang — sendOTP() akan reset attempt counter.
        //   Kalau resend juga sudah max, akan ditolak di kirimOTP() check !resData.success.
        //   Pesan pakai existing key `otp_error_batas_habis` (sudah di message_library DB, SA bisa edit).
        fetchActivityLog({ uid, tenantId, nama, role: roleDipilih, sessionId: '', actionType: 'FORM_SUBMIT', module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', actionDetail: 'OTP MAX_ATTEMPTS server lockout', result: 'FAILED', gpsKota: '' })
        setOtpPercobaan(maxOtpPercobaan)
        setError(m('otp_error_batas_habis', { menit: String(otpExpiryMenit) }))
        setIsLoading(false)
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
  async function handlePilihRole() { setIsLoading(true); setError(''); await lanjutSetelahRole(roleDipilih, tenantId, uid, nama, nomorWA) }
  function handleKembaliDariSesiParalel() { setTahap('KREDENSIAL'); setError('') }
  function togglePassword() { setTampilPassword(prev => !prev) }

  return {
    tahap,
    email, setEmail, password, setPassword, tampilPassword,
    errorEmail, setErrorEmail, errorPassword, setErrorPassword,
    isLoading, error, setError,
    gpsKota: null,  // FIX S#194: GPS dihapus dari critical path login (display di sidebar via cookie)
    akunDikunci, waktuKunci,
    sesiParalel,
    daftarRole, roleDipilih, setRoleDipilih,
    otpInput, setOtpInput, otpPercobaan, maxOtpPercobaan,
    hitunganMundur: otpTimer.hitunganMundur,
    handleLogin, handleVerifikasiOTP, handleKirimUlangOTP,
    handlePilihRole, handleKembaliDariSesiParalel,
    togglePassword, m,
  }
}
