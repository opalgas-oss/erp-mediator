'use client'

// app/aktivasi/page.tsx
// Halaman Aktivasi Akun AdminTenant — K-01 Gaya A (TDD_AT_AUTH_v1.md)
//
// Alur:
//   1. AT klik link aktivasi di email → /auth/confirm-aktivasi (verifyOtp, set session cookie)
//   2. Redirect ke /aktivasi → session SUDAH ada di cookie storage
//   3. useEffect → getSession() → session terbaca → tampilkan form Buat Password
//   4. User isi password baru → supabase.auth.updateUser({ password })
//   5. Setelah berhasil → POST /api/at/aktivasi → update lifecycle_status='active'
//   6. Redirect ke /login?activated=1
//
// PENTING: Halaman ini TIDAK lagi memproses #access_token fragment. Verifikasi token sudah
// dilakukan server-flow di /auth/confirm-aktivasi (verifyOtp token_hash). Saat user sampai
// di sini, session sudah valid — cukup getSession() biasa.
//
// Dibuat: Sesi #252 — HUTANG-AKTIVASI-PAGE
// Update: Sesi #252b — sederhanakan: buang onAuthStateChange+timeout (tebakan), pakai getSession()
//   karena session di-set lebih dulu oleh /auth/confirm-aktivasi.
// Referensi: PROMPT_SESI_252 LANGKAH 2, Research Supabase PKCE S#252

import { useState, useEffect, Suspense } from 'react'
import { useRouter }                      from 'next/navigation'
import { createBrowserSupabaseClient }    from '@/lib/supabase-client'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  )
}

function AktivasiForm() {
  const router = useRouter()
  const [tahap, setTahap]           = useState<'LOADING' | 'FORM' | 'SUKSES' | 'INVALID'>('LOADING')
  const [password, setPassword]     = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [tampil1, setTampil1]       = useState(false)
  const [tampil2, setTampil2]       = useState(false)
  const [error, setError]           = useState('')
  const [isLoading, setIsLoading]   = useState(false)

  useEffect(() => {
    async function cekSession() {
      try {
        const supabase = createBrowserSupabaseClient()
        // Session sudah di-set oleh /auth/confirm-aktivasi (verifyOtp) sebelum sampai sini.
        // getSession() membaca dari cookie storage @supabase/ssr.
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setTahap('FORM')
        } else {
          setTahap('INVALID')
        }
      } catch {
        setTahap('INVALID')
      }
    }
    cekSession()
  }, [])

  async function handleSimpan() {
    if (!password)               { setError('Password wajib diisi'); return }
    if (password.length < 8)    { setError('Password minimal 8 karakter'); return }
    if (password !== konfirmasi) { setError('Password tidak cocok'); return }

    setIsLoading(true)
    setError('')

    try {
      const supabase = createBrowserSupabaseClient()

      // Step 1: Update password via Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr

      // Step 2: Update lifecycle_status='active' via API route
      const res = await fetch('/api/at/aktivasi', { method: 'POST' })
      const json = await res.json() as { ok: boolean; alreadyActive?: boolean; error?: string }

      if (!json.ok) {
        // Jika lifecycle gagal diupdate, catat tapi jangan block user
        // SA bisa melihat dari dashboard bahwa lifecycle masih in_registration
        console.warn('[aktivasi] API lifecycle update gagal:', json.error)
      }

      setTahap('SUKSES')

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      const pesanError = msg.includes('New password should be different from the old password')
        ? 'Password baru tidak boleh sama dengan password lama.'
        : msg.includes('Password should be at least')
        ? 'Password minimal 8 karakter.'
        : msg.includes('Auth session missing')
        ? 'Sesi tidak valid. Minta link aktivasi baru dari Admin.'
        : 'Gagal menyimpan password. Minta link aktivasi baru.'
      setError(pesanError)
    } finally {
      setIsLoading(false)
    }
  }

  if (tahap === 'LOADING') {
    return (
      <Wrapper>
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Memverifikasi link aktivasi...</p>
        </CardContent>
      </Wrapper>
    )
  }

  if (tahap === 'INVALID') {
    return (
      <Wrapper>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-base">Link tidak valid</p>
            <p className="text-sm text-muted-foreground mt-1">
              Link aktivasi sudah kadaluarsa atau tidak valid.<br />
              Hubungi Admin untuk mendapatkan link baru.
            </p>
          </div>
        </CardContent>
      </Wrapper>
    )
  }

  if (tahap === 'SUKSES') {
    return (
      <Wrapper>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-base">Akun berhasil diaktivasi!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Password sudah dibuat. Silakan masuk dengan email dan password Anda.
            </p>
          </div>
          <Button className="w-full" onClick={() => router.push('/login?activated=1')}>
            Masuk Sekarang
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  // Tahap FORM
  return (
    <Wrapper>
      <CardHeader>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
          <svg className="w-5 h-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <CardTitle className="text-center text-lg font-semibold text-gray-900">Aktivasi Akun</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Buat password untuk mengaktifkan akun Admin Tenant Anda
        </p>
      </CardHeader>
      <CardContent className="pb-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="password" className="text-sm text-gray-600 mb-1.5 block">Password Baru</Label>
          <div className="relative">
            <Input
              id="password"
              type={tampil1 ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Minimal 8 karakter"
              disabled={isLoading}
              className="pr-24"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setTampil1(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {tampil1 ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="konfirmasi" className="text-sm text-gray-600 mb-1.5 block">
            Ulangi Password
            {konfirmasi && password && (
              <span className={`ml-2 font-normal ${password === konfirmasi ? 'text-green-500' : 'text-red-500'}`}>
                {password === konfirmasi ? '✓ Cocok' : '✗ Tidak cocok'}
              </span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="konfirmasi"
              type={tampil2 ? 'text' : 'password'}
              value={konfirmasi}
              onChange={e => { setKonfirmasi(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSimpan()}
              placeholder="Ulangi password"
              disabled={isLoading}
              className="pr-24"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setTampil2(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {tampil2 ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>
        <Button className="w-full" disabled={isLoading} onClick={handleSimpan}>
          {isLoading ? 'Mengaktivasi...' : 'Aktifkan Akun'}
        </Button>
      </CardContent>
    </Wrapper>
  )
}

export default function AktivasiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AktivasiForm />
    </Suspense>
  )
}
