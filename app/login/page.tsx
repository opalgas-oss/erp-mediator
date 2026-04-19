'use client'

// app/login/page.tsx
// Halaman login multi-tahap:
//   TAHAP 0 GPS → TAHAP 1 Kredensial → TAHAP 2 Cek Sesi Paralel
//   → TAHAP 3 Pilih Role → TAHAP 4 OTP → TAHAP 5 Biometric → TAHAP 6 Selesai
//
// PERUBAHAN dari versi Firebase:
//   - signInWithEmailAndPassword → supabase.auth.signInWithPassword()
//   - getIdTokenResult → decode JWT access_token untuk baca custom claims
//   - getDoc Firestore → query tabel users / user_profiles PostgreSQL
//   - Manual set cookie 'session' → Supabase SSR kelola cookie otomatis
//   - FIREBASE_ERRORS → SUPABASE_ERROR_KEYS
//
// PERUBAHAN Sesi #037:
//   - Hapus SUPABASE_ERRORS (hardcode pesan) → ganti SUPABASE_ERROR_KEYS (map error ke DB key)
//   - Semua pesan error dan validasi dibaca dari tabel message_library via /api/message-library
//   - Tambah state dbPesan + useEffect fetch pesan saat mount
//   - Tambah fungsi m(key, vars?) sebagai helper baca pesan dengan fallback ke DEFAULT_PESAN
//   - DEFAULT_PESAN dipakai sebagai fallback sampai data DB terload

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams }            from 'next/navigation'
import Link                                       from 'next/link'
import { createBrowserSupabaseClient }            from '@/lib/supabase-client'
import { setSessionCookies, ROLE_DASHBOARD }      from '@/lib/auth'
import {
  getGPSLocation,
  writeSessionLog,
  verifyOTP,
  registerBiometric,
  verifyBiometric,
  getDeviceInfo,
} from '@/lib/session'
import { updateUserPresence, writeActivityLog } from '@/lib/activity'
import { Button }                                from '@/components/ui/button'
import { Input }                                 from '@/components/ui/input'
import { Badge }                                 from '@/components/ui/badge'
import { Label }                                 from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Tipe Tahap Flow Login ────────────────────────────────────────────────────
type Tahap =
  | 'LOADING_GPS'
  | 'GPS_GAGAL'
  | 'KREDENSIAL'
  | 'LOADING'
  | 'SESI_PARALEL'
  | 'ROLE'
  | 'OTP'
  | 'BIOMETRIC'
  | 'SELESAI'

// ─── Default pesan (fallback sampai data dari /api/message-library terload) ───
// Nilai ini HARUS sinkron dengan nilai default di tabel message_library.
// Jika admin mengubah teks pesan via Dashboard, nilai DB yang berlaku — bukan ini.
const DEFAULT_PESAN: Record<string, string> = {
  login_error_credentials_salah:       'Email atau password yang Anda masukkan salah.',
  login_error_email_belum_konfirmasi:  'Email belum dikonfirmasi. Hubungi admin.',
  login_error_terlalu_banyak_percobaan:'Terlalu banyak percobaan. Coba lagi beberapa menit.',
  login_error_koneksi_gagal:           'Gagal terhubung. Periksa koneksi internet.',
  login_error_umum:                    'Terjadi kesalahan. Coba lagi.',
  login_error_gps_diperlukan:          'Aktifkan GPS di browser untuk melanjutkan. Klik ikon lokasi di address bar, lalu izinkan akses lokasi.',
  login_error_config_belum_lengkap:    'Konfigurasi akun belum lengkap. Hubungi admin.',
  login_error_role_tidak_ditemukan:    'Role akun tidak ditemukan. Hubungi admin.',
  login_error_akun_belum_aktif:        'Akun Anda belum diaktifkan. Tunggu verifikasi dari Admin.',
  login_error_gagal_muat_data:         'Gagal memuat data akun. Coba lagi.',
  login_error_gagal_config:            'Gagal memuat konfigurasi. Coba lagi.',
  login_error_gagal_selesaikan:        'Gagal menyelesaikan login. Coba lagi.',
  login_error_akun_dikunci:            'Terlalu banyak percobaan. Akun dikunci hingga pukul {lock_until_wib}.',
  login_validasi_email_kosong:         'Email wajib diisi.',
  login_validasi_email_format:         'Format email tidak valid.',
  login_validasi_password_kosong:      'Password wajib diisi.',
  login_validasi_password_min:         'Password minimal 8 karakter.',
  otp_error_kurang_digit:              'Masukkan 6 digit kode OTP.',
  otp_error_kadaluarsa:                'Kode OTP sudah kadaluarsa. Klik Kirim ulang.',
  otp_error_salah:                     'Kode OTP salah. Sisa percobaan: {sisa_percobaan}.',
  otp_error_batas_habis:               'Batas percobaan OTP habis. Klik Kirim ulang.',
  otp_error_verifikasi_gagal:          'Gagal memverifikasi OTP. Coba lagi.',
}

// ─── Map error Supabase → message library key ─────────────────────────────────
// Tidak hardcode pesan di sini — hanya map ke key yang dibaca dari DB
const SUPABASE_ERROR_KEYS: Record<string, string> = {
  'Invalid login credentials': 'login_error_credentials_salah',
  'Email not confirmed':       'login_error_email_belum_konfirmasi',
  'Too many requests':         'login_error_terlalu_banyak_percobaan',
  'Network request failed':    'login_error_koneksi_gagal',
  'User not found':            'login_error_credentials_salah',
}

// ─── Decode JWT payload ───────────────────────────────────────────────────────
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts  = token.split('.')
    if (parts.length !== 3) return {}
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ─── Tipe Data ────────────────────────────────────────────────────────────────
interface UserProfileRow {
  nama:     string
  role:     string
  status:   string
  nomor_wa: string | null
}

interface DataSesiParalel {
  device:   string
  gps_kota: string
  login_at: unknown
  role:     string
}

// ─── Sub-komponen UI ──────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  )
}

function SpinnerBiru() {
  return (
    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
  )
}

function KotakError({ pesan }: { pesan: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      {pesan}
    </div>
  )
}

// ─── Komponen Form Login ──────────────────────────────────────────────────────
function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || ''

  const [tahap, setTahap] = useState<Tahap>('KREDENSIAL')
  const [gps,   setGps]   = useState<{ lat: number; lng: number; kota: string } | null>(null)

  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [tampilPassword, setTampilPassword] = useState(false)
  const [errorEmail,     setErrorEmail]     = useState('')
  const [errorPassword,  setErrorPassword]  = useState('')
  const [isLoading,      setIsLoading]      = useState(false)
  const [error,          setError]          = useState('')

  const [uid,       setUid]       = useState('')
  const [tenantId,  setTenantId]  = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [nama,      setNama]      = useState('')
  const [nomorWA,   setNomorWA]   = useState('')

  const [akunDikunci, setAkunDikunci] = useState(false)
  const [waktuKunci,  setWaktuKunci]  = useState('')

  const [sesiParalel, setSesiParalel] = useState<DataSesiParalel | null>(null)

  const [daftarRole,  setDaftarRole]  = useState<string[]>([])
  const [roleDipilih, setRoleDipilih] = useState('')

  const [otpInput,          setOtpInput]          = useState('')
  const [otpPercobaan,      setOtpPercobaan]      = useState(0)
  const [maxOtpPercobaan,   setMaxOtpPercobaan]   = useState(3)
  const [otpHitunganMundur, setOtpHitunganMundur] = useState(60)
  const [otpExpiryMenit,    setOtpExpiryMenit]    = useState(5)

  // State untuk pesan dari message_library — di-load sekali saat mount
  const [dbPesan, setDbPesan] = useState<Record<string, string>>({})

  const gpsUdahDiminta = useRef(false)
  const gpsRef         = useRef<{ lat: number; lng: number; kota: string } | null>(null)

  // ── Helper baca pesan: prioritas DB, fallback ke DEFAULT_PESAN ────────────
  // Fungsi ini menggantikan semua string hardcode di kode di bawah
  function m(key: string, vars?: Record<string, string>): string {
    const teks = dbPesan[key] ?? DEFAULT_PESAN[key] ?? key
    if (!vars) return teks
    return teks.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
  }

  // ── Load pesan dari message_library via API saat mount ────────────────────
  // Fetch non-blocking — form tetap bisa dipakai sebelum ini selesai
  useEffect(() => {
    fetch('/api/message-library?kategori=login_ui,otp_ui')
      .then(res => res.json())
      .then(json => { if (json.success && json.data) setDbPesan(json.data) })
      .catch(() => { /* gunakan DEFAULT_PESAN sebagai fallback */ })
  }, [])

  function formatWaktuLogin(ts: unknown): string {
    if (!ts) return 'waktu tidak diketahui'
    try {
      if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
        return new Date((ts as { seconds: number }).seconds * 1000)
          .toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      }
      return new Date(ts as string)
        .toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'waktu tidak diketahui'
    }
  }

  // ── TAHAP 0: GPS background — tidak memblokir form ────────────────────────
  useEffect(() => {
    if (gpsUdahDiminta.current) return
    gpsUdahDiminta.current = true

    async function muatGPSBackground() {
      try {
        const hasil = await getGPSLocation()
        setGps(hasil)
        gpsRef.current = hasil
      } catch {
        // GPS ditolak atau timeout — form tetap berjalan normal
      }
    }
    muatGPSBackground()
  }, [])

  // ── Timer OTP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tahap !== 'OTP' || otpHitunganMundur <= 0) return
    const timer = setTimeout(() => {
      setOtpHitunganMundur(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [tahap, otpHitunganMundur])

  function validasiForm(): boolean {
    let valid = true
    if (!email) { setErrorEmail(m('login_validasi_email_kosong')); valid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorEmail(m('login_validasi_email_format')); valid = false }
    else setErrorEmail('')

    if (!password) { setErrorPassword(m('login_validasi_password_kosong')); valid = false }
    else if (password.length < 8) { setErrorPassword(m('login_validasi_password_min')); valid = false }
    else setErrorPassword('')

    return valid
  }

  // ── TAHAP 1: Submit email + password ──────────────────────────────────────
  async function handleLogin() {
    if (!validasiForm()) return

    // Cek GPS — wajib ada sebelum lanjut autentikasi
    if (!gpsRef.current) {
      setIsLoading(true)
      try {
        const hasilGPS = await getGPSLocation()
        setGps(hasilGPS)
        gpsRef.current = hasilGPS
      } catch {
        setIsLoading(false)
        setError(m('login_error_gps_diperlukan'))
        return
      }
    }

    setIsLoading(true)
    setError('')

    // Cek kunci akun sebelum login
    try {
      const resLock  = await fetch('/api/auth/check-lock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const dataLock = await resLock.json()
      if (dataLock.locked) {
        setError(m('login_error_akun_dikunci', { lock_until_wib: dataLock.lock_until_wib }))
        setIsLoading(false)
        return
      }
    } catch (errLock) {
      console.error('[login] check-lock gagal:', errLock)
    }

    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError || !data.session) {
        throw new Error(authError?.message || 'Login gagal')
      }

      const claims        = decodeJwtPayload(data.session.access_token)
      const claimRole     = claims['app_role']    as string || ''
      const claimTenantId = claims['tenant_id']   as string || ''

      // SUPERADMIN — tidak punya tenant_id
      if (claimRole === 'SUPERADMIN') {
        // Baca session_timeout_minutes dari Modul Konfigurasi via API
        let sessionTimeoutMinutes = 480
        try {
          const resCfg  = await fetch('/api/config/security_login')
          const dataCfg = await resCfg.json()
          const allItems = dataCfg.data?.flatMap((g: { items: Array<{ policy_key?: string; nilai?: string }> }) => g.items) ?? []
          const item     = allItems.find((i: { policy_key?: string }) => i.policy_key === 'session_timeout_minutes')
          if (item?.nilai) sessionTimeoutMinutes = Number(item.nilai) || 480
        } catch (error) {
          console.error('[login] Gagal baca session_timeout_minutes:', error)
        }

        const maxAgeSec = sessionTimeoutMinutes * 60
        const loginAt   = new Date().toISOString()

        setSessionCookies(claimRole, '', maxAgeSec)
        document.cookie = `gps_kota=${encodeURIComponent(gpsRef.current?.kota || 'Tidak Diketahui')}; path=/; max-age=${maxAgeSec}`
        document.cookie = `session_login_at=${encodeURIComponent(loginAt)}; path=/; max-age=${maxAgeSec}`

        // Tulis session log ke Supabase (dibutuhkan TC-I01)
        let sessionId = ''
        try {
          sessionId = await writeSessionLog({
            uid:      data.user.id,
            tenantId: '',
            email,
            role:     claimRole,
            lat:      gpsRef.current?.lat  ?? 0,
            lng:      gpsRef.current?.lng  ?? 0,
            kota:     gpsRef.current?.kota ?? '',
          })
        } catch (error) {
          console.error('[login] Gagal tulis session log SUPERADMIN:', error)
        }

        // Update user presence (dibutuhkan TC-I04)
        updateUserPresence(
          data.user.id, '', sessionId, '', claimRole,
          getDeviceInfo(), gpsRef.current?.kota || '',
          { page: '/login', label: 'Halaman Login', module: 'AUTH' },
        ).catch((error) => console.error('[login] Gagal update presence SUPERADMIN:', error))

        router.push('/dashboard/superadmin')
        return
      }

      if (!claimTenantId) {
        setError(m('login_error_config_belum_lengkap'))
        setIsLoading(false)
        return
      }

      setUid(data.user.id)
      setUserEmail(data.user.email || email)
      setTenantId(claimTenantId)

      fetch('/api/auth/unlock-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: data.user.id, tenant_id: claimTenantId, method: 'auto' }),
      }).catch(err => console.error('[login] unlock-account gagal:', err))

      setTahap('LOADING')
      const resSesi  = await fetch('/api/auth/check-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: data.user.id, tenant_id: claimTenantId }),
      })
      const dataSesi = await resSesi.json()

      if (dataSesi.blocked) {
        setSesiParalel(dataSesi.sessionData || null)
        setTahap('SESI_PARALEL')
        setIsLoading(false)
        return
      }

      await muatDataUser(data.user.id, claimTenantId, claimRole)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''

      try {
        const resLockAcc  = await fetch('/api/auth/lock-account', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, tenant_id: tenantId || 'platform' }),
        })
        const dataLockAcc = await resLockAcc.json()
        if (dataLockAcc.locked) {
          setError(m('login_error_akun_dikunci', { lock_until_wib: dataLockAcc.lock_until_wib }))
          setIsLoading(false)
          return
        }
      } catch (errLockAcc) {
        console.error('[login] lock-account gagal:', errLockAcc)
      }

      // Cari key pesan yang sesuai dari map error Supabase
      const pesanKey = Object.entries(SUPABASE_ERROR_KEYS).find(([key]) =>
        msg.toLowerCase().includes(key.toLowerCase())
      )?.[1] ?? 'login_error_umum'

      setError(m(pesanKey))
      setIsLoading(false)
    }
  }

  // ── TAHAP 3: Baca data user dari PostgreSQL ────────────────────────────────
  async function muatDataUser(uidUser: string, tid: string, claimRole: string) {
    try {
      const supabase = createBrowserSupabaseClient()

      let namaUser    = ''
      let nomorWAUser = ''
      let daftarRoleUser: string[] = []

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nama, role, nomor_wa')
        .eq('id', uidUser)
        .eq('tenant_id', tid)
        .single()

      if (profile) {
        namaUser    = profile.nama || ''
        nomorWAUser = profile.nomor_wa || ''
        daftarRoleUser = [profile.role].filter(Boolean)
      }

      if (daftarRoleUser.length === 0 && claimRole) {
        daftarRoleUser = [claimRole]
      }

      setNama(namaUser)
      setNomorWA(nomorWAUser)
      setDaftarRole(daftarRoleUser)

      if (daftarRoleUser.length === 1) {
        setRoleDipilih(daftarRoleUser[0])
        await lanjutSetelahRole(daftarRoleUser[0], tid, uidUser, namaUser, nomorWAUser)
      } else if (daftarRoleUser.length > 1) {
        setRoleDipilih(daftarRoleUser[0])
        setTahap('ROLE')
        setIsLoading(false)
      } else {
        setError(m('login_error_role_tidak_ditemukan'))
        setTahap('KREDENSIAL')
        setIsLoading(false)
      }
    } catch {
      setError(m('login_error_gagal_muat_data'))
      setTahap('KREDENSIAL')
      setIsLoading(false)
    }
  }

  async function lanjutSetelahRole(
    role: string, tid: string, uidUser: string, namaUser: string, waNumber: string,
  ) {
    try {
      const supabase     = createBrowserSupabaseClient()
      const { data: pol } = await supabase
        .from('platform_policies')
        .select('nilai')
        .eq('feature_key', 'security_login')
        .single()

      const policy     = (pol?.nilai || {}) as Record<string, unknown>
      const isCustomer  = role.toLowerCase() === 'customer'

      // Baca require_otp dari Modul Konfigurasi via API
      // (tidak bisa import lib/config-registry langsung karena ini client component)
      let requireOtp = false
      try {
        const resOtp  = await fetch('/api/config/security_login')
        const dataOtp = await resOtp.json()
        const allItems = dataOtp.data?.flatMap((g: { items: Array<{ policy_key?: string; nilai?: string }> }) => g.items) ?? []
        const otpItem  = allItems.find((i: { policy_key?: string }) => i.policy_key === 'require_otp')
        requireOtp = otpItem?.nilai === 'true'
      } catch {
        // Fallback ke platform_policies jika config_registry gagal
        requireOtp = policy['require_otp'] === true
      }

      const perluOTP = !isCustomer && requireOtp

      if (perluOTP) {
        await kirimOTP(
          uidUser, tid, role, waNumber, namaUser,
        )
      } else {
        setTahap('BIOMETRIC')
        setIsLoading(false)
      }
    } catch {
      setError(m('login_error_gagal_config'))
      setTahap('KREDENSIAL')
      setIsLoading(false)
    }
  }

  async function kirimOTP(
    uidUser: string, tid: string, role: string, waNumber: string, namaUser: string,
  ) {
    setIsLoading(true)
    setError('')

    try {
      // Semua config OTP (expiry, max attempts, resend cooldown, panjang digit)
      // dibaca dari platform_policies via server route — tidak ada hardcode di client
      const res = await fetch('/api/auth/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          uid:      uidUser,
          tenant_id: tid,
          role,
          nomor_wa: waNumber,
          nama:     namaUser,
        }),
      })

      const resData = await res.json()

      writeActivityLog(tid, {
        uid: uidUser, nama: namaUser, tenant_id: tid, session_id: '',
        role, action_type: 'API_CALL', module: 'AUTH',
        page: '/login', page_label: 'Halaman Login',
        action_detail: resData.success ? 'OTP berhasil dikirim' : 'OTP gagal dikirim',
        result: resData.success ? 'SUCCESS' : 'FAILED',
        device: getDeviceInfo(), gps_kota: gps?.kota || '',
      }).catch(() => {})

      // Gunakan nilai dari DB — bukan hardcode
      setOtpExpiryMenit(resData.otp_expiry_minutes     ?? 5)
      setMaxOtpPercobaan(resData.otp_max_attempts       ?? 3)
      setOtpHitunganMundur(resData.resend_cooldown_seconds ?? 60)
      setOtpInput('')
      setOtpPercobaan(0)
      setTahap('OTP')
    } catch (error) {
      console.error('[kirimOTP] error:', error)
      setError(m('otp_error_verifikasi_gagal'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleKirimUlangOTP() {
    await kirimOTP(uid, tenantId, roleDipilih, nomorWA, nama)
  }

  async function handleVerifikasiOTP() {
    if (otpInput.length !== 6) { setError(m('otp_error_kurang_digit')); return }
    setIsLoading(true)
    setError('')

    try {
      const hasil = await verifyOTP({ uid, inputCode: otpInput, tenantId })

      if (hasil === true) {
        writeActivityLog(tenantId, {
          uid, nama, tenant_id: tenantId, session_id: '',
          role: roleDipilih, action_type: 'FORM_SUBMIT', module: 'AUTH',
          page: '/login', page_label: 'Halaman Login',
          action_detail: 'Verifikasi OTP berhasil', result: 'SUCCESS',
          device: getDeviceInfo(), gps_kota: gps?.kota || '',
        }).catch(() => {})
        setTahap('BIOMETRIC')
        setIsLoading(false)
      } else if (hasil === 'EXPIRED') {
        setError(m('otp_error_kadaluarsa'))
        setIsLoading(false)
      } else {
        const percobaanBaru = otpPercobaan + 1
        const sisaPercobaan = maxOtpPercobaan - percobaanBaru
        setOtpPercobaan(percobaanBaru)
        setError(sisaPercobaan <= 0
          ? m('otp_error_batas_habis')
          : m('otp_error_salah', { sisa_percobaan: String(sisaPercobaan) }))
        setIsLoading(false)
      }
    } catch {
      setError(m('otp_error_verifikasi_gagal'))
      setIsLoading(false)
    }
  }

  async function handleAktifkanBiometric() {
    setIsLoading(true)
    setError('')
    const verified = await verifyBiometric({ uid, tenantId })
    if (verified) { await selesaiLogin(); return }
    await registerBiometric({ uid, tenantId })
    await selesaiLogin()
  }

  // ── TAHAP 6: Selesaikan login ──────────────────────────────────────────────
  async function selesaiLogin() {
    setIsLoading(true)
    setTahap('SELESAI')

    try {
      const supabase = createBrowserSupabaseClient()

      if (roleDipilih.toLowerCase() === 'vendor') {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('status')
          .eq('id', uid)
          .eq('tenant_id', tenantId)
          .single()

        const status = (profile?.status || '').toUpperCase()
        if (['PENDING', 'REVIEW'].includes(status)) {
          setError(m('login_error_akun_belum_aktif'))
          setTahap('KREDENSIAL')
          setIsLoading(false)
          return
        }
      }

      const sessionId = await writeSessionLog({
        uid, tenantId, email: userEmail, role: roleDipilih,
        lat:  gpsRef.current?.lat  ?? 0,
        lng:  gpsRef.current?.lng  ?? 0,
        kota: gpsRef.current?.kota ?? '',
      })

      // Baca session_timeout_minutes dari Modul Konfigurasi via API
      let sessionTimeoutMinutes = 480
      try {
        const resCfg  = await fetch('/api/config/security_login')
        const dataCfg = await resCfg.json()
        const allItems = dataCfg.data?.flatMap((g: { items: Array<{ policy_key?: string; nilai?: string }> }) => g.items) ?? []
        const item     = allItems.find((i: { policy_key?: string }) => i.policy_key === 'session_timeout_minutes')
        if (item?.nilai) sessionTimeoutMinutes = Number(item.nilai) || 480
      } catch (error) {
        console.error('[selesaiLogin] Gagal baca session_timeout_minutes:', error)
      }

      const maxAgeSec = sessionTimeoutMinutes * 60
      const loginAt   = new Date().toISOString()

      setSessionCookies(roleDipilih, tenantId, maxAgeSec)
      document.cookie = `gps_kota=${encodeURIComponent(gpsRef.current?.kota || 'Tidak Diketahui')}; path=/; max-age=${maxAgeSec}`
      document.cookie = `session_login_at=${encodeURIComponent(loginAt)}; path=/; max-age=${maxAgeSec}`

      await updateUserPresence(
        uid, tenantId, sessionId, nama, roleDipilih,
        getDeviceInfo(), gpsRef.current?.kota || '',
        { page: '/login', label: 'Halaman Login', module: 'AUTH' },
      )

      if (gps) {
        writeActivityLog(tenantId, {
          uid, nama, tenant_id: tenantId, session_id: sessionId,
          role: roleDipilih, action_type: 'PAGE_VIEW', module: 'AUTH',
          page: '/login', page_label: 'Halaman Login',
          action_detail: `GPS berhasil — kota: ${gps.kota}`,
          result: 'SUCCESS', device: getDeviceInfo(), gps_kota: gps.kota,
        }).catch(() => {})
      }

      writeActivityLog(tenantId, {
        uid, nama, tenant_id: tenantId, session_id: sessionId,
        role: roleDipilih, action_type: 'FORM_SUBMIT', module: 'AUTH',
        page: '/login', page_label: 'Halaman Login',
        action_detail: `Login berhasil sebagai ${roleDipilih}`,
        result: 'SUCCESS', device: getDeviceInfo(), gps_kota: gps?.kota || '',
      }).catch(() => {})

      const tujuan = (redirectTo && redirectTo.startsWith('/'))
        ? redirectTo
        : (ROLE_DASHBOARD[roleDipilih] || ROLE_DASHBOARD[roleDipilih.toUpperCase()] || '/dashboard')

      router.push(tujuan)

    } catch {
      setError(m('login_error_gagal_selesaikan'))
      setTahap('KREDENSIAL')
      setIsLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════
  // RENDER PER TAHAP
  // ═══════════════════════════════════════════════════════

  if (tahap === 'LOADING' || tahap === 'SELESAI') {
    return (
      <Wrapper>
        <CardContent className="pt-6 pb-6 text-center">
          <SpinnerBiru />
          <p className="text-sm text-muted-foreground">
            {tahap === 'SELESAI' ? 'Masuk ke dashboard...' : 'Memverifikasi...'}
          </p>
        </CardContent>
      </Wrapper>
    )
  }

  if (tahap === 'SESI_PARALEL') {
    const device = sesiParalel?.device   || 'perangkat tidak diketahui'
    const kota   = sesiParalel?.gps_kota || 'lokasi tidak diketahui'
    const waktu  = formatWaktuLogin(sesiParalel?.login_at)
    return (
      <Wrapper>
        <CardHeader><CardTitle className="text-center text-base">Sesi Aktif Terdeteksi</CardTitle></CardHeader>
        <CardContent className="pb-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Akun sedang digunakan di <strong>{device}</strong> ({kota}). Login pada <strong>{waktu}</strong>.
          </div>
          <p className="text-sm text-muted-foreground text-center">Hanya satu sesi aktif yang diizinkan.</p>
          <Button variant="outline" className="w-full" onClick={() => { setTahap('KREDENSIAL'); setError('') }}>
            Kembali ke Login
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  if (tahap === 'ROLE') {
    return (
      <Wrapper>
        <CardHeader><CardTitle className="text-center text-base">Masuk Sebagai</CardTitle></CardHeader>
        {gps?.kota && <div className="flex justify-end px-6 -mt-2 mb-0"><Badge variant="outline">📍 {gps.kota}</Badge></div>}
        <CardContent className="pb-6 space-y-4">
          {error && <KotakError pesan={error} />}
          <div>
            <Label htmlFor="pilihRole" className="text-sm text-muted-foreground mb-1.5 block">Pilih role untuk sesi ini</Label>
            <select id="pilihRole" value={roleDipilih} onChange={e => setRoleDipilih(e.target.value)} disabled={isLoading}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors">
              {daftarRole.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Button className="w-full" disabled={isLoading || !roleDipilih}
            onClick={async () => { setIsLoading(true); setError(''); await lanjutSetelahRole(roleDipilih, tenantId, uid, nama, nomorWA) }}>
            {isLoading ? 'Memproses...' : 'Lanjut'}
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  if (tahap === 'OTP') {
    const batasPercobaan = otpPercobaan >= maxOtpPercobaan
    return (
      <Wrapper>
        <CardHeader><CardTitle className="text-center text-base">Verifikasi OTP</CardTitle></CardHeader>
        {gps?.kota && <div className="flex justify-end px-6 -mt-2 mb-0"><Badge variant="outline">📍 {gps.kota}</Badge></div>}
        <CardContent className="pb-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">Kode OTP telah dikirim ke WhatsApp Anda.</p>
          {error && <KotakError pesan={error} />}
          <div>
            <Label htmlFor="inputOTP" className="text-sm text-muted-foreground mb-1.5 block">Kode OTP (6 digit)</Label>
            <Input id="inputOTP" type="text" inputMode="numeric" maxLength={6} value={otpInput}
              onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleVerifikasiOTP()}
              disabled={isLoading || batasPercobaan} placeholder="000000"
              className="text-center text-lg tracking-widest" />
          </div>
          <Button className="w-full" disabled={isLoading || otpInput.length !== 6 || batasPercobaan} onClick={handleVerifikasiOTP}>
            {isLoading ? 'Memverifikasi...' : 'Verifikasi OTP'}
          </Button>
          {otpHitunganMundur > 0
            ? <p className="text-xs text-center text-muted-foreground">Kirim ulang dalam {otpHitunganMundur} detik</p>
            : <Button variant="ghost" className="w-full text-sm" disabled={isLoading} onClick={handleKirimUlangOTP}>Kirim Ulang</Button>
          }
        </CardContent>
      </Wrapper>
    )
  }

  if (tahap === 'BIOMETRIC') {
    return (
      <Wrapper>
        <CardHeader><CardTitle className="text-center text-base">Aktifkan Biometric</CardTitle></CardHeader>
        {gps?.kota && <div className="flex justify-end px-6 -mt-2 mb-0"><Badge variant="outline">📍 {gps.kota}</Badge></div>}
        <CardContent className="pb-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">Aktifkan biometric untuk login berikutnya lebih cepat dan aman.</p>
          {error && <KotakError pesan={error} />}
          <Button className="w-full" disabled={isLoading} onClick={handleAktifkanBiometric}>
            {isLoading ? 'Memproses...' : 'Aktifkan Biometric'}
          </Button>
          <Button variant="ghost" className="w-full text-sm" disabled={isLoading} onClick={selesaiLogin}>Lewati</Button>
        </CardContent>
      </Wrapper>
    )
  }

  // TAHAP 1 (default): Form Email + Password
  return (
    <Wrapper>
      <CardHeader>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
          <span className="text-blue-700 font-semibold text-lg">M</span>
        </div>
        <CardTitle className="text-center text-lg font-semibold text-gray-900">Masuk ke akun Anda</CardTitle>
        <p className="text-sm text-muted-foreground text-center">ERP Mediator Hyperlocal</p>
      </CardHeader>
      <CardContent className="pb-0 space-y-4">
        {akunDikunci && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            Akun dikunci hingga pukul <strong>{waktuKunci}</strong>. Coba lagi nanti.
          </div>
        )}
        {!akunDikunci && error && <KotakError pesan={error} />}
        <div>
          <Label htmlFor="email" className="text-sm text-gray-600 mb-1.5 block">Alamat email</Label>
          <Input id="email" type="email" value={email}
            onChange={e => { setEmail(e.target.value); setErrorEmail('') }}
            placeholder="contoh@email.com" disabled={isLoading}
            className={errorEmail ? 'border-red-400 bg-red-50' : ''} />
          {errorEmail && <p className="text-xs text-red-600 mt-1">{errorEmail}</p>}
        </div>
        <div>
          <Label htmlFor="password" className="text-sm text-gray-600 mb-1.5 block">Password</Label>
          <div className="relative">
            <Input id="password" type={tampilPassword ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setErrorPassword('') }}
              placeholder="Masukkan password" disabled={isLoading}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className={`pr-24 ${errorPassword ? 'border-red-400 bg-red-50' : ''}`} />
            <button type="button" tabIndex={-1} onClick={() => setTampilPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 select-none">
              {tampilPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          {errorPassword && <p className="text-xs text-red-600 mt-1">{errorPassword}</p>}
        </div>
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">Lupa password?</Link>
        </div>
        <Button className="w-full" disabled={isLoading} onClick={handleLogin}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Sedang memverifikasi...
            </span>
          ) : 'Masuk'}
        </Button>
        <p className="text-sm text-center text-gray-500">
          Belum punya akun?{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:text-blue-700">Daftar di sini</Link>
        </p>
        {gps?.kota && gps.kota !== 'Tidak Diketahui' && (
          <div className="flex items-center gap-1 pb-1">
            <span className="text-xs">📍</span>
            <span className="text-xs text-muted-foreground">{gps.kota}</span>
          </div>
        )}
      </CardContent>
    </Wrapper>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginForm />
    </Suspense>
  )
}
