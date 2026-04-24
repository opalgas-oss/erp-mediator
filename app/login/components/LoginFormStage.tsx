// app/login/components/LoginFormStage.tsx
// UI tahap form email + password (KREDENSIAL)
// Dibuat: Sesi #049 — Step 5 TAHAP D

'use client'

import Link  from 'next/link'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrapper, KotakError } from './shared'

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
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">Lupa password?</Link>
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
        <p className="text-sm text-center text-gray-500">
          Belum punya akun?{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:text-blue-700">Daftar di sini</Link>
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
