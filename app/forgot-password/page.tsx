'use client'

import { useState, Suspense } from 'react'
import { useRouter }          from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Wrapper didefinisikan di LUAR ForgotPasswordForm
// agar tidak remount setiap state berubah
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  )
}

function ForgotPasswordForm() {
  const router = useRouter()
  const [tahap, setTahap] = useState<'EMAIL' | 'SUKSES'>('EMAIL')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleKirim() {
    if (!email) { setError('Email wajib diisi'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Format email tidak valid')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const supabase = createBrowserSupabaseClient()
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      })

      if (err) throw err
      setTahap('SUKSES')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      const pesanError = msg.includes('rate limit')
        ? 'Terlalu banyak permintaan. Coba lagi beberapa menit.'
        : msg.includes('Unable to validate')
        ? 'Email tidak terdaftar.'
        : 'Gagal mengirim email. Pastikan email terdaftar dan coba lagi.'
      setError(pesanError)
    } finally {
      setIsLoading(false)
    }
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
            <p className="font-semibold text-gray-900 text-base">Email terkirim</p>
            <p className="text-sm text-muted-foreground mt-1">
              Link reset password sudah dikirim ke <strong>{email}</strong>. Cek inbox atau folder spam.
            </p>
          </div>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Kembali ke Login
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
        <CardTitle className="text-center text-lg font-semibold text-gray-900">
          Lupa Password
        </CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Masukkan email Anda — kami kirimkan link reset password
        </p>
      </CardHeader>
      <CardContent className="pb-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="email" className="text-sm text-gray-600 mb-1.5 block">
            Alamat email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleKirim()}
            placeholder="contoh@email.com"
            disabled={isLoading}
          />
        </div>
        <Button className="w-full" disabled={isLoading} onClick={handleKirim}>
          {isLoading ? 'Mengirim...' : 'Kirim Link Reset Password'}
        </Button>
        <p className="text-sm text-center text-gray-500">
          Ingat password?{' '}
          <a href="/login" className="text-blue-600 font-medium hover:text-blue-700">
            Masuk di sini
          </a>
        </p>
      </CardContent>
    </Wrapper>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}