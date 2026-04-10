'use client'

// app/login/page.tsx
// Halaman login multi-tahap:
//   TAHAP 0 GPS → TAHAP 1 Kredensial → TAHAP 2 Cek Sesi Paralel
//   → TAHAP 3 Pilih Role → TAHAP 4 OTP → TAHAP 5 Biometric → TAHAP 6 Selesai
// Client Component — semua interaksi user terjadi di browser

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { setSessionCookies, ROLE_DASHBOARD } from '@/lib/auth'
import { getEffectivePolicy } from '@/lib/policy'
import {
  getGPSLocation,
  writeSessionLog,
  generateOTP,
  sendOTPviaWA,
  saveOTPtoFirestore,
  verifyOTP,
  registerBiometric,
  verifyBiometric,
  getDeviceInfo,
} from '@/lib/session'
import { updateUserPresence, writeActivityLog } from '@/lib/activity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Tipe Tahap Flow Login ────────────────────────────────────────────────────
type Tahap =
  | 'LOADING_GPS'    // sedang meminta izin GPS
  | 'GPS_GAGAL'      // GPS ditolak user
  | 'KREDENSIAL'     // form email + password
  | 'LOADING'        // transisi antar tahap
  | 'SESI_PARALEL'   // akun diblokir karena sesi aktif di tempat lain
  | 'ROLE'           // pilih role (jika punya lebih dari 1)
  | 'OTP'            // input kode OTP WhatsApp
  | 'BIOMETRIC'      // tawaran aktifkan biometric
  | 'SELESAI'        // redirect ke dashboard

// ─── Peta Error Firebase ke Pesan Indonesia ───────────────────────────────────
const FIREBASE_ERRORS: Record<string, string> = {
  'auth/user-not-found':         'Email atau password salah. Silakan coba lagi.',
  'auth/wrong-password':         'Email atau password salah. Silakan coba lagi.',
  'auth/invalid-credential':     'Email atau password salah. Silakan coba lagi.',
  'auth/too-many-requests':      'Terlalu banyak percobaan. Coba lagi beberapa menit.',
  'auth/network-request-failed': 'Gagal terhubung. Periksa koneksi internet.',
  'auth/user-disabled':          'Akun ini dinonaktifkan. Hubungi admin.',
}

// ─── Tipe Dokumen User di Firestore ──────────────────────────────────────────
interface UserDoc {
  nama:          string
  role:          string | string[]
  status:        string
  wa_number?:    string
  phone_number?: string
}

// ─── Tipe Data Sesi Paralel yang Diblokir ────────────────────────────────────
interface DataSesiParalel {
  device:   string
  gps_kota: string
  login_at: unknown
  role:     string
}

// ─── Sub-komponen UI (di luar LoginForm agar tidak remount setiap render) ─────

// Wrapper layout yang sama untuk semua tahap
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        {children}
      </Card>
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

// ─── Komponen Form Login ───────────────────────────────────────────────────────
function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || ''

  // Tahap flow saat ini
  const [tahap, setTahap] = useState<Tahap>('LOADING_GPS')

  // Data GPS dari TAHAP 0
  const [gps, setGps] = useState<{ lat: number; lng: number; kota: string } | null>(null)

  // Form kredensial TAHAP 1
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [tampilPassword, setTampilPassword] = useState(false)
  const [errorEmail,     setErrorEmail]     = useState('')
  const [errorPassword,  setErrorPassword]  = useState('')

  // State loading dan error umum
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState('')

  // Data user setelah Firebase Auth berhasil
  const [uid,       setUid]       = useState('')
  const [tenantId,  setTenantId]  = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [nama,      setNama]      = useState('')
  const [nomorWA,   setNomorWA]   = useState('')

  // Throttling: batas percobaan dari policy
  const [percobaan,    setPercobaan]    = useState(0)
  const [maxPercobaan, setMaxPercobaan] = useState(0)    // 0 = policy belum dimuat
  const [lockMenit,    setLockMenit]    = useState(30)   // default sementara, diganti dari policy
  const [akunDikunci,  setAkunDikunci]  = useState(false)
  const [waktuKunci,   setWaktuKunci]   = useState('')

  // Data sesi paralel (TAHAP 2)
  const [sesiParalel, setSesiParalel] = useState<DataSesiParalel | null>(null)

  // Pemilihan role (TAHAP 3)
  const [daftarRole,  setDaftarRole]  = useState<string[]>([])
  const [roleDipilih, setRoleDipilih] = useState('')

  // OTP (TAHAP 4)
  const [otpInput,          setOtpInput]          = useState('')
  const [otpPercobaan,      setOtpPercobaan]      = useState(0)
  const [maxOtpPercobaan,   setMaxOtpPercobaan]   = useState(3)   // dari policy
  const [otpHitunganMundur, setOtpHitunganMundur] = useState(60)  // detik sebelum kirim ulang
  const [otpExpiryMenit,    setOtpExpiryMenit]    = useState(5)   // dari policy

  // Ref untuk mencegah double-call GPS
  const gpsUdahDiminta = useRef(false)

  // ── Format timestamp login_at dari check-session (JSON) ──────────────────
  function formatWaktuLogin(ts: unknown): string {
    if (!ts) return 'waktu tidak diketahui'
    try {
      // Firestore Timestamp yang sudah di-serialize ke JSON (bentuk { seconds, nanoseconds })
      if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
        return new Date((ts as { seconds: number }).seconds * 1000).toLocaleString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      }
      return new Date(ts as string).toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return 'waktu tidak diketahui'
    }
  }

  // ── TAHAP 0: Minta GPS saat pertama load ─────────────────────────────────
  useEffect(() => {
    // Guard: jangan panggil GPS dua kali (Strict Mode di dev)
    if (gpsUdahDiminta.current) return
    gpsUdahDiminta.current = true

    async function muatGPS() {
      try {
        const hasil = await getGPSLocation()
        setGps(hasil)
        setTahap('KREDENSIAL')
        // Catatan: writeActivityLog "GPS berhasil" dilakukan di selesaiLogin()
        // karena tenantId baru tersedia setelah login berhasil
      } catch {
        // GPS ditolak atau tidak tersedia di browser ini
        setTahap('GPS_GAGAL')
      }
    }

    muatGPS()
  }, [])

  // ── Timer OTP: hitung mundur per detik (pakai setTimeout agar tidak drift) ─
  useEffect(() => {
    if (tahap !== 'OTP' || otpHitunganMundur <= 0) return

    const timer = setTimeout(() => {
      setOtpHitunganMundur(prev => Math.max(0, prev - 1))
    }, 1000)

    // Cleanup wajib: hentikan timer saat unmount atau tahap berubah
    return () => clearTimeout(timer)
  }, [tahap, otpHitunganMundur])

  // ── Validasi form email + password ────────────────────────────────────────
  function validasiForm(): boolean {
    let valid = true

    if (!email) {
      setErrorEmail('Email wajib diisi')
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorEmail('Format email tidak valid. Contoh: nama@email.com')
      valid = false
    } else {
      setErrorEmail('')
    }

    if (!password) {
      setErrorPassword('Password wajib diisi')
      valid = false
    } else if (password.length < 8) {
      setErrorPassword('Password minimal 8 karakter')
      valid = false
    } else {
      setErrorPassword('')
    }

    return valid
  }

  // ── TAHAP 1: Submit email + password ─────────────────────────────────────
  async function handleLogin() {
    if (akunDikunci) return
    if (!validasiForm()) return

    setIsLoading(true)
    setError('')

    try {
      // Autentikasi via Firebase Auth
      const cred        = await signInWithEmailAndPassword(auth, email, password)
      const tokenResult = await cred.user.getIdTokenResult(true)

      // Ambil tenantId dan role dari custom claims JWT
      const claimTenantId = tokenResult.claims.tenant_id as string
      const claimRole     = tokenResult.claims.role      as string

      if (!claimTenantId) {
        setError('Konfigurasi akun belum lengkap. Hubungi admin.')
        setIsLoading(false)
        return
      }

      // Simpan data auth ke state
      setUid(cred.user.uid)
      setUserEmail(cred.user.email || email)
      setTenantId(claimTenantId)

      // Baca policy security_login — semua nilai keamanan dari sini, tidak ada hardcode
      const loginPolicy = await getEffectivePolicy(claimTenantId, 'security_login')
      setMaxPercobaan(loginPolicy.max_login_attempts)
      setLockMenit(loginPolicy.lock_duration_minutes)
      setMaxOtpPercobaan(loginPolicy.otp_max_attempts)
      setOtpExpiryMenit(loginPolicy.otp_expiry_minutes)

      // ── TAHAP 2: Cek sesi paralel via API ────────────────────────────────
      setTahap('LOADING')

      const resSesi = await fetch('/api/auth/check-session', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uid: cred.user.uid, tenant_id: claimTenantId }),
      })
      const dataSesi = await resSesi.json()

      if (dataSesi.blocked) {
        // Akun diblokir karena ada sesi aktif
        setSesiParalel(dataSesi.sessionData || null)
        setTahap('SESI_PARALEL')
        setIsLoading(false)
        return
      }

      // ── TAHAP 3: Muat data user + role ───────────────────────────────────
      await muatDataUser(cred.user.uid, claimTenantId, claimRole)

    } catch (err: unknown) {
      const code          = (err as { code?: string }).code || ''
      const percobaanBaru = percobaan + 1
      setPercobaan(percobaanBaru)

      // Evaluasi throttling jika policy sudah dimuat (tenantId dari percobaan sebelumnya)
      if (maxPercobaan > 0 && percobaanBaru >= maxPercobaan) {
        const kunciSampai = new Date(Date.now() + lockMenit * 60 * 1000)
        setAkunDikunci(true)
        setWaktuKunci(kunciSampai.toLocaleTimeString('id-ID', {
          hour: '2-digit', minute: '2-digit', hour12: false,
        }))
      }

      // Log login gagal — hanya jika tenantId sudah diketahui
      if (tenantId && uid) {
        writeActivityLog(tenantId, {
          uid, nama, tenant_id: tenantId, session_id: '',
          role: '', action_type: 'FORM_ERROR', module: 'AUTH',
          page: '/login', page_label: 'Halaman Login',
          action_detail: `Login gagal — percobaan ke-${percobaanBaru}: ${code || 'error tidak diketahui'}`,
          result: 'FAILED', device: getDeviceInfo(), gps_kota: gps?.kota || '',
        }).catch(() => {/* log gagal tidak boleh crash UI */})
      }

      setError(FIREBASE_ERRORS[code] || 'Terjadi kesalahan. Coba lagi.')
      setIsLoading(false)
    }
  }

  // ── TAHAP 3: Baca dokumen user dari Firestore → tentukan flow selanjutnya ─
  async function muatDataUser(uidUser: string, tid: string, claimRole: string) {
    try {
      const userRef  = doc(db, 'tenants', tid, 'users', uidUser)
      const userSnap = await getDoc(userRef)

      let daftarRoleUser: string[] = []
      let namaUser                 = ''
      let nomorWAUser              = ''

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserDoc
        namaUser   = userData.nama || ''
        nomorWAUser = userData.wa_number || userData.phone_number || ''

        // Field role bisa berupa string tunggal atau array string
        if (Array.isArray(userData.role)) {
          daftarRoleUser = userData.role.filter(Boolean)
        } else if (userData.role) {
          daftarRoleUser = [userData.role]
        }
      }

      // Fallback ke claim JWT jika dokumen user belum ada atau role kosong
      if (daftarRoleUser.length === 0 && claimRole) {
        daftarRoleUser = [claimRole]
      }

      setNama(namaUser)
      setNomorWA(nomorWAUser)
      setDaftarRole(daftarRoleUser)

      if (daftarRoleUser.length === 1) {
        // Hanya 1 role → langsung lanjut tanpa tampilkan pilihan
        setRoleDipilih(daftarRoleUser[0])
        await lanjutSetelahRole(daftarRoleUser[0], tid, uidUser, namaUser, nomorWAUser)
      } else if (daftarRoleUser.length > 1) {
        // Lebih dari 1 role → tampilkan dropdown
        setRoleDipilih(daftarRoleUser[0])
        setTahap('ROLE')
        setIsLoading(false)
      } else {
        setError('Role akun tidak ditemukan. Hubungi admin.')
        setTahap('KREDENSIAL')
        setIsLoading(false)
      }
    } catch {
      setError('Gagal memuat data akun. Coba lagi.')
      setTahap('KREDENSIAL')
      setIsLoading(false)
    }
  }

  // ── Setelah role dipilih: tentukan perlu OTP atau langsung ke biometric ───
  async function lanjutSetelahRole(
    role:       string,
    tid:        string,
    uidUser:    string,
    namaUser:   string,
    waNumber:   string,
  ) {
    try {
      // Baca ulang policy — tenant_id dari parameter, tidak pernah hardcode
      const loginPolicy = await getEffectivePolicy(tid, 'security_login')
      const isCustomer  = role.toLowerCase() === 'customer'
      const perluOTP    = !isCustomer && loginPolicy.require_otp

      if (perluOTP) {
        // Vendor / AdminTenant / SuperAdmin dengan require_otp = true
        await kirimOTP(
          uidUser, tid, role, waNumber, namaUser,
          loginPolicy.otp_expiry_minutes,
          loginPolicy.otp_max_attempts,
        )
      } else {
        // Customer atau OTP tidak diwajibkan → langsung ke biometric
        setTahap('BIOMETRIC')
        setIsLoading(false)
      }
    } catch {
      setError('Gagal memuat konfigurasi. Coba lagi.')
      setTahap('KREDENSIAL')
      setIsLoading(false)
    }
  }

  // ── TAHAP 4: Generate + simpan + kirim OTP via WhatsApp ──────────────────
  async function kirimOTP(
    uidUser:      string,
    tid:          string,
    role:         string,
    waNumber:     string,
    namaUser:     string,
    expiryMenit:  number,
    maxAttempts:  number,
  ) {
    setIsLoading(true)
    setError('')

    const kodeOTP = generateOTP()

    // Simpan OTP ke Firestore (/tenants/{tid}/otp_codes/{uid})
    await saveOTPtoFirestore({
      uid:           uidUser,
      otpCode:       kodeOTP,
      tenantId:      tid,
      expiryMinutes: expiryMenit,
    })

    // Kirim OTP via WhatsApp Fonnte
    const terkirim = await sendOTPviaWA({
      phoneNumber: waNumber,
      otpCode:     kodeOTP,
      role,
      tenantId:    tid,
    })

    // Log OTP dikirim
    writeActivityLog(tid, {
      uid: uidUser, nama: namaUser, tenant_id: tid, session_id: '',
      role, action_type: 'API_CALL', module: 'AUTH',
      page: '/login', page_label: 'Halaman Login',
      action_detail: terkirim
        ? 'OTP berhasil dikirim via WhatsApp'
        : 'OTP gagal dikirim via WhatsApp — pastikan nomor WA terdaftar',
      result:   terkirim ? 'SUCCESS' : 'FAILED',
      device:   getDeviceInfo(),
      gps_kota: gps?.kota || '',
    }).catch(() => {/* log gagal tidak crash UI */})

    setOtpExpiryMenit(expiryMenit)
    setMaxOtpPercobaan(maxAttempts)
    setOtpHitunganMundur(60)
    setOtpInput('')
    setOtpPercobaan(0)
    setTahap('OTP')
    setIsLoading(false)
  }

  // ── Kirim ulang OTP (setelah hitung mundur selesai) ──────────────────────
  async function handleKirimUlangOTP() {
    await kirimOTP(
      uid, tenantId, roleDipilih, nomorWA, nama,
      otpExpiryMenit, maxOtpPercobaan,
    )
  }

  // ── TAHAP 4: Verifikasi kode OTP yang diinput user ───────────────────────
  async function handleVerifikasiOTP() {
    if (otpInput.length !== 6) {
      setError('Masukkan 6 digit kode OTP.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const hasil = await verifyOTP({ uid, inputCode: otpInput, tenantId })

      if (hasil === true) {
        // Log OTP berhasil
        writeActivityLog(tenantId, {
          uid, nama, tenant_id: tenantId, session_id: '',
          role: roleDipilih, action_type: 'FORM_SUBMIT', module: 'AUTH',
          page: '/login', page_label: 'Halaman Login',
          action_detail: 'Verifikasi OTP berhasil',
          result: 'SUCCESS', device: getDeviceInfo(), gps_kota: gps?.kota || '',
        }).catch(() => {})

        // Lanjut ke tahap biometric
        setTahap('BIOMETRIC')
        setIsLoading(false)

      } else if (hasil === 'EXPIRED') {
        setError('Kode OTP sudah kadaluarsa. Klik Kirim ulang.')
        setIsLoading(false)

      } else {
        // OTP salah — hitung sisa percobaan
        const percobaanBaru  = otpPercobaan + 1
        const sisaPercobaan  = maxOtpPercobaan - percobaanBaru
        setOtpPercobaan(percobaanBaru)

        if (sisaPercobaan <= 0) {
          setError('Batas percobaan OTP habis. Klik Kirim ulang untuk mendapatkan kode baru.')
        } else {
          setError(`Kode OTP salah. Sisa percobaan: ${sisaPercobaan}`)
        }
        setIsLoading(false)
      }
    } catch {
      setError('Gagal memverifikasi OTP. Coba lagi.')
      setIsLoading(false)
    }
  }

  // ── TAHAP 5: Aktifkan biometric (coba verifikasi dulu, lalu registrasi) ──
  async function handleAktifkanBiometric() {
    setIsLoading(true)
    setError('')

    // Coba verifikasi biometric jika ada trusted device yang terdaftar
    const verified = await verifyBiometric({ uid, tenantId })
    if (verified) {
      // Trusted device valid dan biometric berhasil → langsung selesai
      await selesaiLogin()
      return
    }

    // Belum ada trusted device → daftarkan perangkat baru
    await registerBiometric({ uid, tenantId })

    // Lanjut ke login selesai terlepas registrasi berhasil atau tidak
    await selesaiLogin()
  }

  // ── TAHAP 6: Tulis log sesi, update presence, lalu redirect ──────────────
  async function selesaiLogin() {
    setIsLoading(true)
    setTahap('SELESAI')

    try {
      // Baca ulang status vendor — cegah redirect jika akun belum aktif
      const userRef  = doc(db, 'tenants', tenantId, 'users', uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const userData    = userSnap.data() as UserDoc
        const isVendor    = roleDipilih.toLowerCase() === 'vendor'
        const statusUpper = (userData.status || '').toUpperCase()
        const belumAktif  = ['PENDING', 'REVIEW'].includes(statusUpper)

        if (isVendor && belumAktif) {
          // Vendor belum diverifikasi — tampilkan pesan, JANGAN redirect
          setError('Akun Anda belum diaktifkan. Tunggu verifikasi dari Admin.')
          setTahap('KREDENSIAL')
          setIsLoading(false)
          return
        }
      }

      // Tulis session log → hasilkan sessionId unik
      const sessionId = await writeSessionLog({
        uid,
        tenantId,
        email: userEmail,
        role:  roleDipilih,
        lat:   gps?.lat || 0,
        lng:   gps?.lng || 0,
        kota:  gps?.kota || '',
      })

      // Set cookie session (role + tenantId)
      setSessionCookies(roleDipilih, tenantId)

      // Update presence user secara realtime
      await updateUserPresence(
        uid, tenantId, sessionId, nama, roleDipilih,
        getDeviceInfo(), gps?.kota || '',
        { page: '/login', label: 'Halaman Login', module: 'AUTH' },
      )

      // Log GPS berhasil (deferred dari TAHAP 0 — tenantId baru tersedia sekarang)
      if (gps) {
        writeActivityLog(tenantId, {
          uid, nama, tenant_id: tenantId, session_id: sessionId,
          role: roleDipilih, action_type: 'PAGE_VIEW', module: 'AUTH',
          page: '/login', page_label: 'Halaman Login',
          action_detail: `GPS berhasil — kota: ${gps.kota}`,
          result: 'SUCCESS', device: getDeviceInfo(), gps_kota: gps.kota,
        }).catch(() => {})
      }

      // Log login berhasil
      writeActivityLog(tenantId, {
        uid, nama, tenant_id: tenantId, session_id: sessionId,
        role: roleDipilih, action_type: 'FORM_SUBMIT', module: 'AUTH',
        page: '/login', page_label: 'Halaman Login',
        action_detail: `Login berhasil sebagai ${roleDipilih}`,
        result: 'SUCCESS', device: getDeviceInfo(), gps_kota: gps?.kota || '',
      }).catch(() => {})

      // Redirect ke dashboard berdasarkan role
      const tujuan =
        (redirectTo && redirectTo.startsWith('/'))
          ? redirectTo
          : (ROLE_DASHBOARD[roleDipilih] || ROLE_DASHBOARD[roleDipilih.toUpperCase()] || '/dashboard')

      router.push(tujuan)

    } catch {
      setError('Gagal menyelesaikan login. Coba lagi.')
      setTahap('KREDENSIAL')
      setIsLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER PER TAHAP
  // ═══════════════════════════════════════════════════════════════════════════

  // ── TAHAP 0: Loading GPS ──────────────────────────────────────────────────
  if (tahap === 'LOADING_GPS') {
    return (
      <Wrapper>
        <CardContent className="pt-6 pb-6 text-center">
          <SpinnerBiru />
          <p className="text-sm text-muted-foreground">Meminta izin lokasi...</p>
        </CardContent>
      </Wrapper>
    )
  }

  // ── TAHAP 0 Gagal: GPS Ditolak ────────────────────────────────────────────
  if (tahap === 'GPS_GAGAL') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Izin Lokasi Diperlukan</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Izin lokasi diperlukan. Aktifkan GPS di browser lalu muat ulang.
          </p>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Muat Ulang
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── Transisi: Loading antar tahap ────────────────────────────────────────
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

  // ── TAHAP 2: Sesi Paralel Diblokir ───────────────────────────────────────
  if (tahap === 'SESI_PARALEL') {
    const device = sesiParalel?.device   || 'perangkat tidak diketahui'
    const kota   = sesiParalel?.gps_kota || 'lokasi tidak diketahui'
    const waktu  = formatWaktuLogin(sesiParalel?.login_at)

    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Sesi Aktif Terdeteksi</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Akun sedang digunakan di <strong>{device}</strong> ({kota}).
            Login pada <strong>{waktu}</strong>.
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Hanya satu sesi aktif yang diizinkan. Logout dari perangkat lain terlebih dahulu.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setTahap('KREDENSIAL'); setError('') }}
          >
            Kembali ke Login
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── TAHAP 3: Pilih Role ───────────────────────────────────────────────────
  if (tahap === 'ROLE') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Masuk Sebagai</CardTitle>
        </CardHeader>
        {gps?.kota && (
          <div className="flex justify-end px-6 -mt-2 mb-0">
            <Badge variant="outline">📍 {gps.kota}</Badge>
          </div>
        )}
        <CardContent className="pb-6 space-y-4">
          {error && <KotakError pesan={error} />}

          <div>
            <Label htmlFor="pilihRole" className="text-sm text-muted-foreground mb-1.5 block">
              Pilih role untuk sesi ini
            </Label>
            <select
              id="pilihRole"
              value={roleDipilih}
              onChange={e => setRoleDipilih(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              {daftarRole.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <Button
            className="w-full"
            disabled={isLoading || !roleDipilih}
            onClick={async () => {
              setIsLoading(true)
              setError('')
              // Gunakan tenantId dari state yang sudah di-set di handleLogin
              await lanjutSetelahRole(roleDipilih, tenantId, uid, nama, nomorWA)
            }}
          >
            {isLoading ? 'Memproses...' : 'Lanjut'}
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── TAHAP 4: Input OTP ───────────────────────────────────────────────────
  if (tahap === 'OTP') {
    const batasPercobaan = otpPercobaan >= maxOtpPercobaan

    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Verifikasi OTP</CardTitle>
        </CardHeader>
        {gps?.kota && (
          <div className="flex justify-end px-6 -mt-2 mb-0">
            <Badge variant="outline">📍 {gps.kota}</Badge>
          </div>
        )}
        <CardContent className="pb-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Kode OTP telah dikirim ke WhatsApp Anda. Masukkan 6 digit kode di bawah ini.
          </p>

          {error && <KotakError pesan={error} />}

          <div>
            <Label htmlFor="inputOTP" className="text-sm text-muted-foreground mb-1.5 block">
              Kode OTP (6 digit)
            </Label>
            <Input
              id="inputOTP"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={e => {
                // Hanya izinkan angka
                setOtpInput(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              onKeyDown={e => e.key === 'Enter' && handleVerifikasiOTP()}
              disabled={isLoading || batasPercobaan}
              placeholder="000000"
              className="text-center text-lg tracking-widest"
            />
          </div>

          <Button
            className="w-full"
            disabled={isLoading || otpInput.length !== 6 || batasPercobaan}
            onClick={handleVerifikasiOTP}
          >
            {isLoading ? 'Memverifikasi...' : 'Verifikasi OTP'}
          </Button>

          {/* Hitung mundur / tombol kirim ulang */}
          {otpHitunganMundur > 0 ? (
            <p className="text-xs text-center text-muted-foreground">
              Kirim ulang dalam {otpHitunganMundur} detik
            </p>
          ) : (
            <Button
              variant="ghost"
              className="w-full text-sm"
              disabled={isLoading}
              onClick={handleKirimUlangOTP}
            >
              Kirim Ulang
            </Button>
          )}
        </CardContent>
      </Wrapper>
    )
  }

  // ── TAHAP 5: Tawaran Biometric ───────────────────────────────────────────
  if (tahap === 'BIOMETRIC') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Aktifkan Biometric</CardTitle>
        </CardHeader>
        {gps?.kota && (
          <div className="flex justify-end px-6 -mt-2 mb-0">
            <Badge variant="outline">📍 {gps.kota}</Badge>
          </div>
        )}
        <CardContent className="pb-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Aktifkan biometric (sidik jari / Face ID) agar login berikutnya lebih cepat dan aman.
          </p>

          {error && <KotakError pesan={error} />}

          <Button
            className="w-full"
            disabled={isLoading}
            onClick={handleAktifkanBiometric}
          >
            {isLoading ? 'Memproses...' : 'Aktifkan Biometric'}
          </Button>

          {/* Tombol Lewati — langsung ke selesaiLogin tanpa biometric */}
          <Button
            variant="ghost"
            className="w-full text-sm"
            disabled={isLoading}
            onClick={selesaiLogin}
          >
            Lewati
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── TAHAP 1 (default): Form Email + Password ──────────────────────────────
  return (
    <Wrapper>
      <CardHeader>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
          <span className="text-blue-700 font-semibold text-lg">M</span>
        </div>
        <CardTitle className="text-center text-lg font-semibold text-gray-900">
          Masuk ke akun Anda
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          ERP Mediator Hyperlocal
        </p>
      </CardHeader>

      {gps?.kota && (
        <div className="flex justify-end px-6 -mt-2 mb-0">
          <Badge variant="outline">📍 {gps.kota}</Badge>
        </div>
      )}

      <CardContent className="pb-6 space-y-4">
        {/* Pesan akun dikunci karena terlalu banyak percobaan */}
        {akunDikunci && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            Terlalu banyak percobaan. Akun dikunci hingga pukul <strong>{waktuKunci}</strong>. Coba lagi nanti.
          </div>
        )}

        {/* Error umum (bukan error field) */}
        {!akunDikunci && error && <KotakError pesan={error} />}

        {/* Field Email */}
        <div>
          <Label htmlFor="email" className="text-sm text-gray-600 mb-1.5 block">
            Alamat email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrorEmail('') }}
            placeholder="contoh@email.com"
            disabled={isLoading || akunDikunci}
            aria-invalid={!!errorEmail}
            className={errorEmail ? 'border-red-400 bg-red-50' : ''}
          />
          {errorEmail && (
            <p className="text-xs text-red-600 mt-1">{errorEmail}</p>
          )}
        </div>

        {/* Field Password dengan toggle tampilkan/sembunyikan */}
        <div>
          <Label htmlFor="password" className="text-sm text-gray-600 mb-1.5 block">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={tampilPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setErrorPassword('') }}
              placeholder="Masukkan password"
              disabled={isLoading || akunDikunci}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              aria-invalid={!!errorPassword}
              className={`pr-24 ${errorPassword ? 'border-red-400 bg-red-50' : ''}`}
            />
            {/* Tombol toggle show/hide — bukan input, tidak submit form */}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setTampilPassword(prev => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 select-none"
              aria-label={tampilPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {tampilPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          {errorPassword && (
            <p className="text-xs text-red-600 mt-1">{errorPassword}</p>
          )}
        </div>

        {/* Link lupa password */}
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
            Lupa password?
          </Link>
        </div>

        {/* Tombol Masuk */}
        <Button
          className="w-full"
          disabled={isLoading || akunDikunci}
          onClick={handleLogin}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Sedang memverifikasi...
            </span>
          ) : 'Masuk'}
        </Button>

        {/* Link daftar akun baru */}
        <p className="text-sm text-center text-gray-500">
          Belum punya akun?{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:text-blue-700">
            Daftar di sini
          </Link>
        </p>
      </CardContent>
    </Wrapper>
  )
}

// ─── Export: Wrapper Suspense wajib karena LoginForm pakai useSearchParams ────
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginForm />
    </Suspense>
  )
}
