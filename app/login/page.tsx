// app/login/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { setSessionCookies, ROLE_DASHBOARD } from '@/lib/auth'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/user-not-found':        'Email atau password salah. Silakan coba lagi.',
  'auth/wrong-password':        'Email atau password salah. Silakan coba lagi.',
  'auth/invalid-credential':    'Email atau password salah. Silakan coba lagi.',
  'auth/too-many-requests':     'Terlalu banyak percobaan. Coba lagi beberapa menit.',
  'auth/network-request-failed':'Gagal terhubung. Periksa koneksi internet.',
  'auth/user-disabled':         'Akun ini dinonaktifkan. Hubungi admin.',
}

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') || ''

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [errors,    setErrors]    = useState({ email: '', password: '' })

  function validateForm(): boolean {
    const e = { email: '', password: '' }
    let ok = true

    if (!email) {
      e.email = 'Email wajib diisi'; ok = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Format email tidak valid. Contoh: nama@email.com'; ok = false
    }

    if (!password) {
      e.password = 'Password wajib diisi'; ok = false
    } else if (password.length < 8) {
      e.password = 'Password minimal 8 karakter'; ok = false
    }

    setErrors(e)
    return ok
  }

  async function handleLogin() {
    setAuthError('')
    if (!validateForm()) return
    setIsLoading(true)

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const tokenResult = await cred.user.getIdTokenResult(true)
      const role     = tokenResult.claims.role      as string
      const tenantId = tokenResult.claims.tenant_id as string

      if (!role || !tenantId) {
        setAuthError('Konfigurasi akun belum lengkap. Hubungi admin.')
        setIsLoading(false)
        return
      }

      setSessionCookies(role, tenantId)

      const destination =
        redirectTo && redirectTo.startsWith('/')
          ? redirectTo
          : ROLE_DASHBOARD[role] || '/dashboard'

      router.push(destination)

    } catch (err: any) {
      const msg = FIREBASE_ERRORS[err.code] || 'Terjadi kesalahan. Coba lagi.'
      setAuthError(msg)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm">

        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-5">
          <span className="text-blue-700 font-semibold text-lg">M</span>
        </div>

        <h1 className="text-xl font-semibold text-center text-gray-900 mb-1">
          Masuk ke akun Anda
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          ERP Mediator Hyperlocal
        </p>

        {authError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
            {authError}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1.5">
            Alamat email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ''})) }}
            placeholder="contoh@email.com"
            disabled={isLoading}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
              ${errors.email
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 bg-gray-50 focus:border-blue-500 focus:bg-white'
              }`}
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email}</p>
          )}
        </div>

        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: ''})) }}
            placeholder="Masukkan password"
            disabled={isLoading}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
              ${errors.password
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300 bg-gray-50 focus:border-blue-500 focus:bg-white'
              }`}
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password}</p>
          )}
        </div>

        <div className="text-right mb-4">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
            Lupa password?
          </Link>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all
            ${isLoading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
            }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
              </svg>
              Sedang memverifikasi...
            </span>
          ) : 'Masuk'}
        </button>

        <p className="text-sm text-center text-gray-500 mt-4">
          Belum punya akun?{' '}
          <Link href="/register" className="text-blue-600 font-medium hover:text-blue-700">
            Daftar di sini
          </Link>
        </p>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginForm />
    </Suspense>
  )
}