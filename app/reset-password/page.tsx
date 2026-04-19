'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams }     from 'next/navigation'
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

function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [tahap, setTahap]           = useState<'LOADING' | 'FORM' | 'SUKSES' | 'INVALID'>('LOADING')
  const [password, setPassword]     = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [tampil1, setTampil1]       = useState(false)
  const [tampil2, setTampil2]       = useState(false)
  const [error, setError]           = useState('')
  const [isLoading, setIsLoading]   = useState(false)

  useEffect(() => {
    async function cekSession() {
      const errorParam = searchParams.get('error')
      if (errorParam) { setTahap('INVALID'); return }

      try {
        const supabase = createBrowserSupabaseClient()
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
  }, [searchParams])

  async function handleSimpan() {
    if (!password)               { setError('Password baru wajib diisi'); return }
    if (password.length < 8)    { setError('Password minimal 8 karakter'); return }
    if (password !== konfirmasi) { setError('Password tidak cocok'); return }

    setIsLoading(true)
    setError('')

    try {
      const supabase = createBrowserSupabaseClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setTahap('SUKSES')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      const pesanError = msg.includes('New password should be different from the old password')
        ? 'Password baru tidak boleh sama dengan password lama.'
        : msg.includes('Password should be at least')
        ? 'Password minimal 8 karakter.'
        : msg.includes('Auth session missing')
        ? 'Sesi tidak valid. Minta link reset password baru.'
        : 'Gagal mengubah password. Minta link baru.'
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
          <p className="text-sm text-muted-foreground">Memverifikasi link...</p>
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
            <p className="text-sm text-muted-foreground mt-1">Link sudah expired atau tidak valid. Minta link baru.</p>
          </div>
          <Button className="w-full" onClick={() => router.push('/forgot-password')}>
            Minta Link Baru
          </Button>
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
            <p className="font-semibold text-gray-900 text-base">Password berhasil diubah</p>
            <p className="text-sm text-muted-foreground mt-1">Silakan login dengan password baru Anda.</p>
          </div>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Masuk Sekarang
          </Button>
        </CardContent>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <CardHeader>
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-1">
          <span className="text-blue-700 font-semibold text-lg">M</span>
        </div>
        <CardTitle className="text-center text-lg font-semibold text-gray-900">Buat Password Baru</CardTitle>
        <p className="text-sm text-muted-foreground text-center">Masukkan password baru untuk akun Anda</p>
      </CardHeader>
      <CardContent className="pb-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <div>
          <Label htmlFor="password" className="text-sm text-gray-600 mb-1.5 block">Password Baru</Label>
          <div className="relative">
            <Input id="password" type={tampil1 ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Minimal 8 karakter" disabled={isLoading} className="pr-24" />
            <button type="button" tabIndex={-1} onClick={() => setTampil1(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {tampil1 ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="konfirmasi" className="text-sm text-gray-600 mb-1.5 block">
            Ulangi Password Baru
            {konfirmasi && password && (
              <span className={`ml-2 font-normal ${password === konfirmasi ? 'text-green-500' : 'text-red-500'}`}>
                {password === konfirmasi ? '✓ Cocok' : '✗ Tidak cocok'}
              </span>
            )}
          </Label>
          <div className="relative">
            <Input id="konfirmasi" type={tampil2 ? 'text' : 'password'} value={konfirmasi}
              onChange={e => { setKonfirmasi(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSimpan()}
              placeholder="Ulangi password" disabled={isLoading} className="pr-24" />
            <button type="button" tabIndex={-1} onClick={() => setTampil2(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
              {tampil2 ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>
        <Button className="w-full" disabled={isLoading} onClick={handleSimpan}>
          {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
        </Button>
      </CardContent>
    </Wrapper>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}