'use client'

// app/register/page.tsx
// Halaman pendaftaran — 2 tab: Customer (2 layer) dan Vendor
// GPS wajib diizinkan sebelum form muncul
// tenant_id dibaca dari Firestore platform_config — TIDAK hardcode

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  getDocs,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { getConfigValue } from '@/lib/config-registry'
import { getGPSLocation, getDeviceInfo } from '@/lib/session'
import { writeActivityLog } from '@/lib/activity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Tipe Tampilan (State Machine Layar) ─────────────────────────────────────
type TabAktif = 'CUSTOMER' | 'VENDOR'

type Tampilan =
  | 'LOADING_GPS'      // sedang meminta izin GPS
  | 'GPS_GAGAL'        // GPS ditolak user
  | 'LOADING_CONFIG'   // memuat tenantId + kota + kategori dari Firestore
  | 'CONFIG_GAGAL'     // gagal muat config platform
  | 'PILIH_CARA'       // Customer Layer 0: pilih cara masuk
  | 'QUICK_EMAIL'      // Customer Layer 0 Pilihan A: email cepat
  | 'CUSTOMER_FORM'    // Customer Layer 1: form lengkap
  | 'VENDOR_FORM'      // Vendor: form pendaftaran lengkap
  | 'SUKSES_QUICK'     // Customer cepat berhasil simpan
  | 'SUKSES_VENDOR'    // Vendor berhasil — tunggu verifikasi admin

// ─── Tipe Item Dropdown ───────────────────────────────────────────────────────
interface ItemDropdown { id: string; nama: string }

// ─── Tipe Errors Form ─────────────────────────────────────────────────────────
interface ErrorsCustomer {
  nama?:           string
  email?:          string
  nomorWA?:        string
  password?:       string
  ulangiPassword?: string
  kota?:           string
  umum?:           string
}

interface ErrorsVendor {
  nama?:           string
  email?:          string
  nomorWA?:        string
  password?:       string
  ulangiPassword?: string
  namaToko?:       string
  kota?:           string
  kategori?:       string
  umum?:           string
}

// ─── Konstanta ────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WA_REGEX    = /^(\+62|62|0)8[1-9][0-9]{7,11}$/

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use':  'Email ini sudah terdaftar. Silakan login.',
  'auth/weak-password':          'Password terlalu lemah.',
  'auth/network-request-failed': 'Gagal terhubung. Periksa koneksi internet.',
}

// ─── Komponen Utama ───────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter()

  // Status GPS dan data koordinat
  const [gps,       setGps]       = useState<{ lat: number; lng: number; kota: string } | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'ok' | 'gagal'>('loading')

  // Status config dan data dari Firestore
  const [tenantId,       setTenantId]       = useState('')
  const [daftarKota,     setDaftarKota]     = useState<ItemDropdown[]>([])
  const [daftarKategori, setDaftarKategori] = useState<ItemDropdown[]>([])
  const [configStatus,   setConfigStatus]   = useState<'loading' | 'ok' | 'gagal'>('loading')

  // Navigasi
  const [tabAktif, setTabAktif] = useState<TabAktif>('CUSTOMER')
  const [tampilan, setTampilan] = useState<Tampilan>('LOADING_GPS')

  // Loading umum
  const [isLoading, setIsLoading] = useState(false)

  // ── State Customer ──────────────────────────────────────────────────────────
  const [quickEmail,    setQuickEmail]    = useState('')
  const [errQuickEmail, setErrQuickEmail] = useState('')

  const [cNama,         setCNama]         = useState('')
  const [cEmail,        setCEmail]        = useState('')
  const [cNomorWA,      setCNomorWA]      = useState('')
  const [cPassword,     setCPassword]     = useState('')
  const [cUlangi,       setCUlangi]       = useState('')
  const [cKota,         setCKota]         = useState('')
  const [cTampilPass,   setCTampilPass]   = useState(false)
  const [cTampilUlangi, setCTampilUlangi] = useState(false)
  const [errC,          setErrC]          = useState<ErrorsCustomer>({})

  // ── State Vendor ────────────────────────────────────────────────────────────
  const [vNama,         setVNama]         = useState('')
  const [vEmail,        setVEmail]        = useState('')
  const [vNomorWA,      setVNomorWA]      = useState('')
  const [vPassword,     setVPassword]     = useState('')
  const [vUlangi,       setVUlangi]       = useState('')
  const [vNamaToko,     setVNamaToko]     = useState('')
  const [vKota,         setVKota]         = useState('')
  const [vKategori,     setVKategori]     = useState('')
  const [vTampilPass,   setVTampilPass]   = useState(false)
  const [vTampilUlangi, setVTampilUlangi] = useState(false)
  const [errV,          setErrV]          = useState<ErrorsVendor>({})

  // Ref untuk mencegah double-call (React Strict Mode)
  const gpsUdahDiminta   = useRef(false)
  const configUdahDimuat = useRef(false)

  // ── TAHAP 0: Minta izin GPS ───────────────────────────────────────────────
  useEffect(() => {
    if (gpsUdahDiminta.current) return
    gpsUdahDiminta.current = true

    getGPSLocation()
      .then(hasil => { setGps(hasil); setGpsStatus('ok') })
      .catch(() => setGpsStatus('gagal'))
  }, [])

  // ── Muat tenantId + kota + kategori secara paralel dengan GPS ────────────
  useEffect(() => {
    if (configUdahDimuat.current) return
    configUdahDimuat.current = true

    async function muatConfig() {
      try {
        // Baca tenant_id aktif dari Firestore — tidak boleh hardcode
        // Path: /platform_config/settings → field active_tenant_id
        const settingsSnap = await getDoc(doc(db, 'platform_config', 'settings'))
        if (!settingsSnap.exists() || !settingsSnap.data().active_tenant_id) {
          throw new Error('active_tenant_id tidak ditemukan di platform_config/settings')
        }
        const tid = settingsSnap.data().active_tenant_id as string
        setTenantId(tid)

        // Baca kota dari Firestore — wajib ada limit, tidak boleh ambil semua sekaligus
        const kotaSnap = await getDocs(
          query(collection(db, 'tenants', tid, 'cities'), limit(200))
        )
        setDaftarKota(kotaSnap.docs.map(d => ({
          id:   d.id,
          nama: (d.data().name ?? d.data().nama ?? d.id) as string,
        })))

        // Baca kategori jasa dari Firestore — limit wajib ada
        const katSnap = await getDocs(
          query(collection(db, 'tenants', tid, 'categories'), limit(200))
        )
        setDaftarKategori(katSnap.docs.map(d => ({
          id:   d.id,
          nama: (d.data().name ?? d.data().nama ?? d.id) as string,
        })))

        setConfigStatus('ok')
      } catch {
        setConfigStatus('gagal')
      }
    }

    muatConfig()
  }, [])

  // ── Sinkronisasi tampilan berdasarkan status GPS dan config ───────────────
  useEffect(() => {
    if (gpsStatus === 'loading')     { setTampilan('LOADING_GPS');    return }
    if (gpsStatus === 'gagal')       { setTampilan('GPS_GAGAL');      return }
    if (configStatus === 'loading')  { setTampilan('LOADING_CONFIG'); return }
    if (configStatus === 'gagal')    { setTampilan('CONFIG_GAGAL');   return }

    // GPS + config siap → tampilkan layar awal (hanya jika masih di layar loading)
    const LAYAR_TRANSISI: Tampilan[] = ['LOADING_GPS', 'LOADING_CONFIG', 'GPS_GAGAL', 'CONFIG_GAGAL']
    setTampilan(prev =>
      LAYAR_TRANSISI.includes(prev)
        ? (tabAktif === 'CUSTOMER' ? 'PILIH_CARA' : 'VENDOR_FORM')
        : prev  // jangan override layar form / sukses yang sudah aktif
    )
  }, [gpsStatus, configStatus, tabAktif])

  // ── Ganti tab (Customer ↔ Vendor) ─────────────────────────────────────────
  function gantiTab(tab: TabAktif) {
    setTabAktif(tab)
    if (gpsStatus === 'ok' && configStatus === 'ok') {
      setTampilan(tab === 'CUSTOMER' ? 'PILIH_CARA' : 'VENDOR_FORM')
    }
    setErrC({})
    setErrV({})
  }

  // ── Validasi Customer form lengkap ────────────────────────────────────────
  function validasiCustomer(): boolean {
    const e: ErrorsCustomer = {}
    if (!cNama.trim() || cNama.trim().length < 3)
      e.nama = 'Nama minimal 3 karakter'
    if (!EMAIL_REGEX.test(cEmail))
      e.email = 'Format email tidak valid. Contoh: nama@email.com'
    if (!WA_REGEX.test(cNomorWA.replace(/[\s-]/g, '')))
      e.nomorWA = 'Format nomor WA tidak valid. Contoh: 08123456789'
    if (cPassword.length < 8)
      e.password = 'Password minimal 8 karakter'
    if (cUlangi !== cPassword)
      e.ulangiPassword = 'Password tidak cocok'
    if (!cKota)
      e.kota = 'Pilih kota domisili Anda'
    setErrC(e)
    return Object.keys(e).length === 0
  }

  // ── Validasi Vendor form ──────────────────────────────────────────────────
  function validasiVendor(): boolean {
    const e: ErrorsVendor = {}
    if (!vNama.trim() || vNama.trim().length < 3)
      e.nama = 'Nama minimal 3 karakter'
    if (!EMAIL_REGEX.test(vEmail))
      e.email = 'Format email tidak valid. Contoh: nama@email.com'
    if (!WA_REGEX.test(vNomorWA.replace(/[\s-]/g, '')))
      e.nomorWA = 'Format nomor WA tidak valid. Contoh: 08123456789'
    if (vPassword.length < 8)
      e.password = 'Password minimal 8 karakter'
    if (vUlangi !== vPassword)
      e.ulangiPassword = 'Password tidak cocok'
    if (!vNamaToko.trim() || vNamaToko.trim().length < 3)
      e.namaToko = 'Nama toko minimal 3 karakter'
    if (!vKota)
      e.kota = 'Pilih kota operasional'
    if (!vKategori)
      e.kategori = 'Pilih kategori jasa'
    setErrV(e)
    return Object.keys(e).length === 0
  }

  // ── Customer Pilihan A: simpan email cepat ke Firestore ──────────────────
  async function handleQuickEmail() {
    if (!EMAIL_REGEX.test(quickEmail)) {
      setErrQuickEmail('Format email tidak valid. Contoh: nama@email.com')
      return
    }

    setIsLoading(true)
    setErrQuickEmail('')

    try {
      // Simpan ke /tenants/{tenantId}/quick_registrations (akun terbatas, tanpa password)
      await addDoc(collection(db, 'tenants', tenantId, 'quick_registrations'), {
        email:      quickEmail.trim(),
        tenant_id:  tenantId,
        gps_kota:   gps?.kota || '',
        status:     'quick_registered',
        created_at: serverTimestamp(),
      })

      setTampilan('SUKSES_QUICK')
    } catch {
      setErrQuickEmail('Gagal menyimpan. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Customer Pilihan B: daftar lengkap ────────────────────────────────────
  async function handleDaftarCustomer() {
    if (!validasiCustomer()) return

    setIsLoading(true)
    setErrC({})

    try {
      // Buat akun Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, cEmail.trim(), cPassword)
      const uid  = cred.user.uid

      // Set custom claims via API server (tidak bisa dari browser langsung)
      const resKlaim = await fetch('/api/auth/set-custom-claims', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uid, role: 'CUSTOMER', tenant_id: tenantId }),
      })
      if (!resKlaim.ok) throw new Error('Gagal menetapkan hak akses akun')

      // Simpan profil ke /tenants/{tenantId}/users/{uid}
      await setDoc(doc(db, 'tenants', tenantId, 'users', uid), {
        uid,
        tenant_id:  tenantId,
        nama:       cNama.trim(),
        email:      cEmail.trim(),
        wa_number:  cNomorWA.trim(),
        kota:       cKota,
        role:       'customer',
        status:     'active',
        gps_kota:   gps?.kota || '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })

      // Force refresh token agar custom claims langsung terbaca di browser
      await cred.user.getIdToken(true)

      // Log register berhasil
      writeActivityLog(tenantId, {
        uid, nama: cNama.trim(), tenant_id: tenantId, session_id: '',
        role: 'customer', action_type: 'FORM_SUBMIT', module: 'AUTH',
        page: '/register', page_label: 'Halaman Pendaftaran',
        action_detail: 'Pendaftaran Customer berhasil',
        result: 'SUCCESS', device: getDeviceInfo(), gps_kota: gps?.kota || '',
      }).catch(() => {/* log gagal tidak crash UI */})

      // Redirect ke dashboard customer
      router.push('/dashboard/customer')

    } catch (err: unknown) {
      const code = (err as { code?: string }).code || ''
      setErrC({ umum: FIREBASE_ERRORS[code] || (err as Error).message || 'Terjadi kesalahan. Coba lagi.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ── Vendor: daftar, simpan ke 2 koleksi, antri notifikasi ────────────────
  async function handleDaftarVendor() {
    if (!validasiVendor()) return

    setIsLoading(true)
    setErrV({})

    try {
      // Buat akun Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, vEmail.trim(), vPassword)
      const uid  = cred.user.uid

      // Set custom claims
      const resKlaim = await fetch('/api/auth/set-custom-claims', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uid, role: 'VENDOR', tenant_id: tenantId }),
      })
      if (!resKlaim.ok) throw new Error('Gagal menetapkan hak akses akun')

      // Simpan profil ke /tenants/{tenantId}/users/{uid}
      await setDoc(doc(db, 'tenants', tenantId, 'users', uid), {
        uid,
        tenant_id:  tenantId,
        nama:       vNama.trim(),
        email:      vEmail.trim(),
        wa_number:  vNomorWA.trim(),
        kota:       vKota,
        role:       'vendor',
        status:     'PENDING',
        gps_kota:   gps?.kota || '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })

      // Simpan data pendaftaran vendor ke /tenants/{tenantId}/vendor_registrations/{uid}
      await setDoc(doc(db, 'tenants', tenantId, 'vendor_registrations', uid), {
        uid,
        tenant_id:    tenantId,
        nama:         vNama.trim(),
        email:        vEmail.trim(),
        wa_number:    vNomorWA.trim(),
        nama_toko:    vNamaToko.trim(),
        kota_id:      vKota,
        kategori_id:  vKategori,
        status:       'PENDING',
        gps_kota:     gps?.kota || '',
        submitted_at: serverTimestamp(),
      })

      // Baca template pesan dari Config Registry — tidak boleh hardcode teks pesan
      const [waTemplate, emailTemplate] = await Promise.all([
        getConfigValue('message_library', 'vendor_pending_wa')
          .catch(() => 'Pendaftaran Anda sedang diproses. Tim kami akan menghubungi Anda segera.'),
        getConfigValue('message_library', 'vendor_pending_email')
          .catch(() => 'Pendaftaran vendor Anda sedang dalam proses verifikasi oleh admin.'),
      ])

      // Antri notifikasi WA ke vendor — diproses oleh background worker, bukan langsung kirim
      // (FONNTE_API_KEY hanya tersedia di server, tidak di browser)
      await addDoc(collection(db, 'tenants', tenantId, 'wa_queue'), {
        tenant_id:  tenantId,
        type:       'VENDOR_PENDING_NOTIFICATION',
        to:         vNomorWA.trim(),
        message:    waTemplate,
        status:     'PENDING',
        created_at: serverTimestamp(),
      })

      // Antri notifikasi email ke vendor — diproses oleh background worker
      await addDoc(collection(db, 'tenants', tenantId, 'email_queue'), {
        tenant_id:  tenantId,
        type:       'VENDOR_PENDING_NOTIFICATION',
        to:         vEmail.trim(),
        subject:    'Pendaftaran Vendor Diterima — Menunggu Verifikasi Admin',
        message:    emailTemplate,
        status:     'PENDING',
        created_at: serverTimestamp(),
      })

      // Log register vendor berhasil
      writeActivityLog(tenantId, {
        uid, nama: vNama.trim(), tenant_id: tenantId, session_id: '',
        role: 'vendor', action_type: 'FORM_SUBMIT', module: 'AUTH',
        page: '/register', page_label: 'Halaman Pendaftaran',
        action_detail: 'Pendaftaran Vendor berhasil — status PENDING',
        result: 'SUCCESS', device: getDeviceInfo(), gps_kota: gps?.kota || '',
      }).catch(() => {})

      // Tampilkan konfirmasi — JANGAN redirect ke dashboard, Vendor belum diverifikasi
      setTampilan('SUKSES_VENDOR')

    } catch (err: unknown) {
      const code = (err as { code?: string }).code || ''
      setErrV({ umum: FIREBASE_ERRORS[code] || (err as Error).message || 'Terjadi kesalahan. Coba lagi.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KOMPONEN UI REUSABLE
  // ═══════════════════════════════════════════════════════════════════════════

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
        <Card className="w-full max-w-md">{children}</Card>
      </div>
    )
  }

  function SpinnerBiru() {
    return <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
  }

  function KotakError({ pesan }: { pesan: string }) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
        {pesan}
      </div>
    )
  }

  function ErrField({ pesan }: { pesan?: string }) {
    if (!pesan) return null
    return <p className="text-xs text-red-600 mt-1">{pesan}</p>
  }

  // Tombol toggle tampil/sembunyikan password
  function TombolTogglePassword({ tampil, onToggle }: { tampil: boolean; onToggle: () => void }) {
    return (
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 select-none"
        aria-label={tampil ? 'Sembunyikan password' : 'Tampilkan password'}
      >
        {tampil ? 'Sembunyikan' : 'Tampilkan'}
      </button>
    )
  }

  // Dropdown pilihan dari Firestore
  function Dropdown({
    id, value, onChange, disabled, placeholder, daftar, errorPesan,
  }: {
    id: string; value: string; onChange: (v: string) => void
    disabled: boolean; placeholder: string
    daftar: ItemDropdown[]; errorPesan?: string
  }) {
    return (
      <>
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-blue-500 transition-colors ${
            errorPesan ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 focus:bg-white'
          }`}
        >
          <option value="">{placeholder}</option>
          {daftar.map(item => (
            <option key={item.id} value={item.id}>{item.nama}</option>
          ))}
        </select>
        <ErrField pesan={errorPesan} />
      </>
    )
  }

  // Tab switcher Customer | Vendor
  function TabSwitcher() {
    const aktif = gpsStatus === 'ok' && configStatus === 'ok'
    return (
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
        {(['CUSTOMER', 'VENDOR'] as TabAktif[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => aktif && gantiTab(tab)}
            disabled={!aktif}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tabAktif === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab === 'CUSTOMER' ? 'Customer' : 'Vendor / Mitra'}
          </button>
        ))}
      </div>
    )
  }

  // Link ke login (dipakai di bawah beberapa layar)
  function LinkLogin() {
    return (
      <p className="text-sm text-center text-gray-500">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
          Masuk di sini
        </Link>
      </p>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER PER TAMPILAN
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Loading GPS ──────────────────────────────────────────────────────────
  if (tampilan === 'LOADING_GPS') {
    return (
      <Wrapper>
        <CardContent className="pt-6 pb-6 text-center">
          <SpinnerBiru />
          <p className="text-sm text-muted-foreground">Meminta izin lokasi...</p>
        </CardContent>
      </Wrapper>
    )
  }

  // ── GPS Ditolak ──────────────────────────────────────────────────────────
  if (tampilan === 'GPS_GAGAL') {
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

  // ── Memuat Konfigurasi ────────────────────────────────────────────────────
  if (tampilan === 'LOADING_CONFIG') {
    return (
      <Wrapper>
        <CardContent className="pt-6 pb-6 text-center">
          <SpinnerBiru />
          <p className="text-sm text-muted-foreground">Memuat konfigurasi platform...</p>
        </CardContent>
      </Wrapper>
    )
  }

  // ── Config Gagal ─────────────────────────────────────────────────────────
  if (tampilan === 'CONFIG_GAGAL') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Konfigurasi Tidak Tersedia</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Gagal memuat konfigurasi platform. Periksa koneksi dan coba lagi.
          </p>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Coba Lagi
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── Sukses Vendor: konfirmasi pending ─────────────────────────────────────
  if (tampilan === 'SUKSES_VENDOR') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Pendaftaran Berhasil</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Pendaftaran berhasil. Tunggu verifikasi dari Admin.
          </p>
          <p className="text-sm text-muted-foreground">
            Kami akan menghubungi Anda via WhatsApp dan email setelah akun diverifikasi.
            Proses verifikasi memakan waktu 1–2 hari kerja.
          </p>
          <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
            Kembali ke Halaman Login
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── Sukses Quick Email ────────────────────────────────────────────────────
  if (tampilan === 'SUKSES_QUICK') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Terima Kasih!</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 text-center space-y-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800">
            Email Anda telah kami terima.
          </p>
          <p className="text-sm text-muted-foreground">
            Link aktivasi akan dikirim ke <strong>{quickEmail}</strong> segera.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => { setTampilan('PILIH_CARA'); setQuickEmail('') }}
          >
            Kembali
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── Customer Layer 0: Pilih Cara Masuk ───────────────────────────────────
  if (tampilan === 'PILIH_CARA') {
    return (
      <Wrapper>
        <CardHeader>
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
            <span className="text-blue-700 font-semibold text-lg">M</span>
          </div>
          <CardTitle className="text-center text-lg">Buat Akun Baru</CardTitle>
          <p className="text-sm text-muted-foreground text-center">ERP Mediator Hyperlocal</p>
        </CardHeader>
        <CardContent className="pb-6 space-y-3">
          <TabSwitcher />

          <p className="text-sm text-muted-foreground text-center mb-1">
            Pilih cara mendaftar sebagai Customer:
          </p>

          {/* Pilihan A: Masuk cepat dengan email saja */}
          <button
            type="button"
            onClick={() => setTampilan('QUICK_EMAIL')}
            className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <p className="font-semibold text-sm text-gray-800">Masuk cepat dengan email</p>
            <p className="text-xs text-gray-500 mt-1">
              Cukup email — tanpa password. Kami kirim link aktivasi ke inbox Anda.
            </p>
          </button>

          {/* Pilihan B: Daftar dengan data lengkap */}
          <button
            type="button"
            onClick={() => setTampilan('CUSTOMER_FORM')}
            className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <p className="font-semibold text-sm text-gray-800">Daftar dengan data lengkap</p>
            <p className="text-xs text-gray-500 mt-1">
              Isi nama, WA, dan password. Akun langsung aktif setelah daftar.
            </p>
          </button>

          <LinkLogin />
        </CardContent>
      </Wrapper>
    )
  }

  // ── Customer Layer 0 Pilihan A: Input Email Cepat ────────────────────────
  if (tampilan === 'QUICK_EMAIL') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Masuk Cepat dengan Email</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          <TabSwitcher />

          <p className="text-sm text-muted-foreground text-center">
            Masukkan email Anda. Kami akan kirimkan link aktivasi segera.
          </p>

          {errQuickEmail && <KotakError pesan={errQuickEmail} />}

          <div>
            <Label htmlFor="quickEmail" className="text-sm text-gray-600 mb-1.5 block">
              Alamat email
            </Label>
            <Input
              id="quickEmail"
              type="email"
              value={quickEmail}
              onChange={e => { setQuickEmail(e.target.value); setErrQuickEmail('') }}
              onKeyDown={e => e.key === 'Enter' && handleQuickEmail()}
              placeholder="contoh@email.com"
              disabled={isLoading}
              className={errQuickEmail ? 'border-red-400 bg-red-50' : ''}
            />
          </div>

          <Button className="w-full" disabled={isLoading} onClick={handleQuickEmail}>
            {isLoading ? 'Menyimpan...' : 'Kirim Link Aktivasi'}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-sm"
            disabled={isLoading}
            onClick={() => { setTampilan('PILIH_CARA'); setErrQuickEmail('') }}
          >
            Kembali
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // ── Customer Layer 1: Form Data Lengkap ──────────────────────────────────
  if (tampilan === 'CUSTOMER_FORM') {
    return (
      <Wrapper>
        <CardHeader>
          <CardTitle className="text-center text-base">Daftar Sebagai Customer</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 space-y-4">
          <TabSwitcher />

          {errC.umum && <KotakError pesan={errC.umum} />}

          {/* Nama lengkap */}
          <div>
            <Label htmlFor="cNama" className="text-sm text-gray-600 mb-1.5 block">Nama lengkap</Label>
            <Input
              id="cNama"
              value={cNama}
              onChange={e => { setCNama(e.target.value); setErrC(p => ({ ...p, nama: undefined })) }}
              placeholder="Contoh: Budi Santoso"
              disabled={isLoading}
              className={errC.nama ? 'border-red-400 bg-red-50' : ''}
            />
            <ErrField pesan={errC.nama} />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="cEmail" className="text-sm text-gray-600 mb-1.5 block">Email</Label>
            <Input
              id="cEmail"
              type="email"
              value={cEmail}
              onChange={e => { setCEmail(e.target.value); setErrC(p => ({ ...p, email: undefined })) }}
              placeholder="budi@email.com"
              disabled={isLoading}
              className={errC.email ? 'border-red-400 bg-red-50' : ''}
            />
            <ErrField pesan={errC.email} />
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <Label htmlFor="cWA" className="text-sm text-gray-600 mb-1.5 block">Nomor WhatsApp</Label>
            <Input
              id="cWA"
              type="tel"
              value={cNomorWA}
              onChange={e => { setCNomorWA(e.target.value); setErrC(p => ({ ...p, nomorWA: undefined })) }}
              placeholder="08123456789"
              disabled={isLoading}
              className={errC.nomorWA ? 'border-red-400 bg-red-50' : ''}
            />
            <ErrField pesan={errC.nomorWA} />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="cPass" className="text-sm text-gray-600 mb-1.5 block">Password</Label>
            <div className="relative">
              <Input
                id="cPass"
                type={cTampilPass ? 'text' : 'password'}
                value={cPassword}
                onChange={e => { setCPassword(e.target.value); setErrC(p => ({ ...p, password: undefined })) }}
                placeholder="Minimal 8 karakter"
                disabled={isLoading}
                className={`pr-24 ${errC.password ? 'border-red-400 bg-red-50' : ''}`}
              />
              <TombolTogglePassword tampil={cTampilPass} onToggle={() => setCTampilPass(p => !p)} />
            </div>
            <ErrField pesan={errC.password} />
          </div>

          {/* Ulangi Password */}
          <div>
            <Label htmlFor="cUlangi" className="text-sm text-gray-600 mb-1.5 block">Ulangi password</Label>
            <div className="relative">
              <Input
                id="cUlangi"
                type={cTampilUlangi ? 'text' : 'password'}
                value={cUlangi}
                onChange={e => { setCUlangi(e.target.value); setErrC(p => ({ ...p, ulangiPassword: undefined })) }}
                placeholder="Ulangi password"
                disabled={isLoading}
                className={`pr-24 ${errC.ulangiPassword ? 'border-red-400 bg-red-50' : ''}`}
              />
              <TombolTogglePassword tampil={cTampilUlangi} onToggle={() => setCTampilUlangi(p => !p)} />
            </div>
            <ErrField pesan={errC.ulangiPassword} />
          </div>

          {/* Kota domisili — dari Firestore */}
          <div>
            <Label htmlFor="cKota" className="text-sm text-gray-600 mb-1.5 block">Kota domisili</Label>
            <Dropdown
              id="cKota"
              value={cKota}
              onChange={v => { setCKota(v); setErrC(p => ({ ...p, kota: undefined })) }}
              disabled={isLoading}
              placeholder="Pilih kota"
              daftar={daftarKota}
              errorPesan={errC.kota}
            />
          </div>

          <Button className="w-full" disabled={isLoading} onClick={handleDaftarCustomer}>
            {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-sm"
            disabled={isLoading}
            onClick={() => { setTampilan('PILIH_CARA'); setErrC({}) }}
          >
            Kembali
          </Button>

          <LinkLogin />
        </CardContent>
      </Wrapper>
    )
  }

  // ── Vendor Form (default render — tabAktif === 'VENDOR') ─────────────────
  return (
    <Wrapper>
      <CardHeader>
        <CardTitle className="text-center text-base">Daftar Sebagai Vendor</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Akun perlu diverifikasi Admin sebelum aktif
        </p>
      </CardHeader>
      <CardContent className="pb-6 space-y-4">
        <TabSwitcher />

        {errV.umum && <KotakError pesan={errV.umum} />}

        {/* Nama lengkap */}
        <div>
          <Label htmlFor="vNama" className="text-sm text-gray-600 mb-1.5 block">Nama lengkap</Label>
          <Input
            id="vNama"
            value={vNama}
            onChange={e => { setVNama(e.target.value); setErrV(p => ({ ...p, nama: undefined })) }}
            placeholder="Contoh: Budi Santoso"
            disabled={isLoading}
            className={errV.nama ? 'border-red-400 bg-red-50' : ''}
          />
          <ErrField pesan={errV.nama} />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="vEmail" className="text-sm text-gray-600 mb-1.5 block">Email</Label>
          <Input
            id="vEmail"
            type="email"
            value={vEmail}
            onChange={e => { setVEmail(e.target.value); setErrV(p => ({ ...p, email: undefined })) }}
            placeholder="budi@email.com"
            disabled={isLoading}
            className={errV.email ? 'border-red-400 bg-red-50' : ''}
          />
          <ErrField pesan={errV.email} />
        </div>

        {/* Nomor WhatsApp */}
        <div>
          <Label htmlFor="vWA" className="text-sm text-gray-600 mb-1.5 block">Nomor WhatsApp</Label>
          <Input
            id="vWA"
            type="tel"
            value={vNomorWA}
            onChange={e => { setVNomorWA(e.target.value); setErrV(p => ({ ...p, nomorWA: undefined })) }}
            placeholder="08123456789"
            disabled={isLoading}
            className={errV.nomorWA ? 'border-red-400 bg-red-50' : ''}
          />
          <ErrField pesan={errV.nomorWA} />
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="vPass" className="text-sm text-gray-600 mb-1.5 block">Password</Label>
          <div className="relative">
            <Input
              id="vPass"
              type={vTampilPass ? 'text' : 'password'}
              value={vPassword}
              onChange={e => { setVPassword(e.target.value); setErrV(p => ({ ...p, password: undefined })) }}
              placeholder="Minimal 8 karakter"
              disabled={isLoading}
              className={`pr-24 ${errV.password ? 'border-red-400 bg-red-50' : ''}`}
            />
            <TombolTogglePassword tampil={vTampilPass} onToggle={() => setVTampilPass(p => !p)} />
          </div>
          <ErrField pesan={errV.password} />
        </div>

        {/* Ulangi Password */}
        <div>
          <Label htmlFor="vUlangi" className="text-sm text-gray-600 mb-1.5 block">Ulangi password</Label>
          <div className="relative">
            <Input
              id="vUlangi"
              type={vTampilUlangi ? 'text' : 'password'}
              value={vUlangi}
              onChange={e => { setVUlangi(e.target.value); setErrV(p => ({ ...p, ulangiPassword: undefined })) }}
              placeholder="Ulangi password"
              disabled={isLoading}
              className={`pr-24 ${errV.ulangiPassword ? 'border-red-400 bg-red-50' : ''}`}
            />
            <TombolTogglePassword tampil={vTampilUlangi} onToggle={() => setVTampilUlangi(p => !p)} />
          </div>
          <ErrField pesan={errV.ulangiPassword} />
        </div>

        {/* Nama Toko */}
        <div>
          <Label htmlFor="vToko" className="text-sm text-gray-600 mb-1.5 block">Nama toko</Label>
          <Input
            id="vToko"
            value={vNamaToko}
            onChange={e => { setVNamaToko(e.target.value); setErrV(p => ({ ...p, namaToko: undefined })) }}
            placeholder="Contoh: AC Budi Sejahtera"
            disabled={isLoading}
            className={errV.namaToko ? 'border-red-400 bg-red-50' : ''}
          />
          <ErrField pesan={errV.namaToko} />
        </div>

        {/* Kota operasional — dari Firestore */}
        <div>
          <Label htmlFor="vKota" className="text-sm text-gray-600 mb-1.5 block">Kota operasional</Label>
          <Dropdown
            id="vKota"
            value={vKota}
            onChange={v => { setVKota(v); setErrV(p => ({ ...p, kota: undefined })) }}
            disabled={isLoading}
            placeholder="Pilih kota"
            daftar={daftarKota}
            errorPesan={errV.kota}
          />
        </div>

        {/* Kategori jasa — dari Firestore */}
        <div>
          <Label htmlFor="vKategori" className="text-sm text-gray-600 mb-1.5 block">Kategori jasa</Label>
          <Dropdown
            id="vKategori"
            value={vKategori}
            onChange={v => { setVKategori(v); setErrV(p => ({ ...p, kategori: undefined })) }}
            disabled={isLoading}
            placeholder="Pilih kategori"
            daftar={daftarKategori}
            errorPesan={errV.kategori}
          />
        </div>

        <Button className="w-full" disabled={isLoading} onClick={handleDaftarVendor}>
          {isLoading ? 'Mendaftarkan...' : 'Daftar sebagai Vendor'}
        </Button>

        <LinkLogin />
      </CardContent>
    </Wrapper>
  )
}
