// app/login/components/LoginFormStage.tsx
// UI tahap form email + password (KREDENSIAL)
// Dibuat: Sesi #049 — Step 5 TAHAP D
//
// FIX Sesi #058 LANGKAH 2 (post-deploy investigasi):
//   2 <Link> ke /forgot-password dan /register diberi prefetch={false}.
//   Alasan: Network tab menunjukkan 15+ RSC prefetch yang nyampah saat login flow
//   (re-render LoginFormStage memicu re-prefetch untuk setiap state change).
//   Kedua halaman ini bukan navigasi yang pasti dilakukan user, jadi prefetch
//   tidak memberi manfaat dan justru saturasi bandwidth di Incognito tanpa cache.
//
// S#200 OPSI B — Tambah Magic Link Auth sebagai opsi sekunder:
//   Tombol 'Masuk Tanpa Password' toggle ke form email-only.
//   Kirim link via sendMagicLinkAction → user cek email → klik link → masuk.
//   Password login tetap primary (Vendor lapangan tidak selalu ada akses email).

'use client'

import { useState } from 'react'
import Link  from 'next/link'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrapper, KotakError } from './shared'
import { sendMagicLinkAction } from '@/app/login/actions'

interface LoginFormStageProps {
  email:          string
  password:       string
  tampilPassword: boolean
  errorEmail:     string
  errorPassword:  string
  isLoading:      boolean
  error:          string
  akunDikunci:    boolean
  waktuKunci:     string
  gpsKota:        string | null
  onEmailChange:    (v: string) => void
  onPasswordChange: (v: string) => void
  onTogglePassword: () => void
  onLogin:          () => void
}

export function LoginFormStage(props: LoginFormStageProps) {
  const {
    email, password, tampilPassword, errorEmail, errorPassword,
    isLoading, error, akunDikunci, waktuKunci, gpsKota,
    onEmailChange, onPasswordChange, onTogglePassword, onLogin,
  } = props

  // ─ Magic Link state (lokal, tidak perlu naik ke useLoginFlow) ─────────────
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [magicEmail,    setMagicEmail]    = useState('')
  const [magicStatus,   setMagicStatus]   = useState<'IDLE' | 'LOADING' | 'SENT' | 'ERROR'>('IDLE')
  const [magicError,    setMagicError]    = useState('')

  async function handleSendMagicLink() {
    if (!magicEmail || !magicEmail.includes('@')) {
      setMagicError('Masukkan alamat email yang valid')
      return
    }
    setMagicStatus('LOADING')
    setMagicError('')
    try {
      const result = await sendMagicLinkAction(magicEmail)
      if (result.ok) {
        setMagicStatus('SENT')
      } else {
        setMagicStatus('ERROR')
        setMagicError(result.error ?? 'Gagal mengirim link. Coba lagi.')
      }
    } catch {
      setMagicStatus('ERROR')
      setMagicError('Koneksi gagal. Coba lagi.')
    }
  }

  // ─ Render Magic Link form ─────────────────────────────────────────
  if (showMagicLink) {
    return (
      <Wrapper>
        <CardHeader>
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <CardTitle className="text-center text-lg font-semibold text-gray-900">Masuk Tanpa Password</CardTitle>
          <p className="text-sm text-muted-foreground text-center">Link login akan dikirim ke email Anda</p>
        </CardHeader>
        <CardContent className="pb-0 space-y-4">
          {magicStatus === 'SENT' ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Link dikirim!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cek email <strong>{magicEmail}</strong> dan klik link untuk masuk.
                </p>
                <p className="text-xs text-muted-foreground mt-2">Link berlaku 15–30 menit. Cek folder spam jika tidak muncul.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setShowMagicLink(false); setMagicStatus('IDLE'); setMagicEmail('') }}>
                Kembali ke Login
              </Button>
            </div>
          ) : (
            <>
              {magicStatus === 'ERROR' && <KotakError pesan={magicError} />}
              <div>
                <Label htmlFor="magic-email" className="text-sm text-gray-600 mb-1.5 block">Alamat email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  value={magicEmail}
                  onChange={e => setMagicEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMagicLink()}
                  placeholder="contoh@email.com"
                  disabled={magicStatus === 'LOADING'}
                />
              </div>
              <Button className="w-full" disabled={magicStatus === 'LOADING'} onClick={handleSendMagicLink}>
                {magicStatus === 'LOADING' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                    Mengirim link...
                  </span>
                ) : 'Kirim Link Login'}
              </Button>
              <button
                type="button"
                onClick={() => { setShowMagicLink(false); setMagicStatus('IDLE'); setMagicError('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
              >
                ← Kembali ke login dengan password
              </button>
            </>
          )}
        </CardContent>
      </Wrapper>
    )
  }

  // ─ Render Password form (default) ──────────────────────────────────
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
            onChange={e => onEmailChange(e.target.value)}
            placeholder="contoh@email.com" disabled={isLoading}
            className={errorEmail ? 'border-red-400 bg-red-50' : ''} />
          {errorEmail && <p className="text-xs text-red-600 mt-1">{errorEmail}</p>}
        </div>
        <div>
          <Label htmlFor="password" className="text-sm text-gray-600 mb-1.5 block">Password</Label>
          <div className="relative">
            <Input id="password" type={tampilPassword ? 'text' : 'password'} value={password}
              onChange={e => onPasswordChange(e.target.value)}
              placeholder="Masukkan password" disabled={isLoading}
              onKeyDown={e => e.key === 'Enter' && onLogin()}
              className={`pr-24 ${errorPassword ? 'border-red-400 bg-red-50' : ''}`} />
            <button type="button" tabIndex={-1} onClick={onTogglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 select-none">
              {tampilPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
          {errorPassword && <p className="text-xs text-red-600 mt-1">{errorPassword}</p>}
        </div>
        <div className="text-right">
          <Link href="/forgot-password" prefetch={false} className="text-sm text-blue-600 hover:text-blue-700">Lupa password?</Link>
        </div>
        <Button className="w-full" disabled={isLoading} onClick={onLogin}>
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
        {/* S#200 OPSI B — Magic Link secondary option */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">atau</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isLoading}
          onClick={() => { setShowMagicLink(true); setMagicEmail(email) }}
        >
          Masuk Tanpa Password
        </Button>
        <p className="text-sm text-center text-gray-500">
          Belum punya akun?{' '}
          <Link href="/register" prefetch={false} className="text-blue-600 font-medium hover:text-blue-700">Daftar di sini</Link>
        </p>
        {gpsKota && gpsKota !== 'Tidak Diketahui' && (
          <div className="flex items-center gap-1 pb-1">
            <span className="text-xs">📍</span>
            <span className="text-xs text-muted-foreground">{gpsKota}</span>
          </div>
        )}
      </CardContent>
    </Wrapper>
  )
}
