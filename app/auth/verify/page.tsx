'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Halaman ini sengaja menampilkan tombol — TIDAK langsung verifikasi token
// Tujuan: cegah Gmail/email scanner consume token saat preview link di email
// Token diverifikasi HANYA saat user klik tombol secara manual
function VerifyForm() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const [status, setStatus]     = useState<'IDLE' | 'LOADING' | 'ERROR'>('IDLE')
  const [errorMsg, setErrorMsg] = useState('')

  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/reset-password'

  if (!token_hash || !type) {
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

  async function handleVerify() {
    setStatus('LOADING')
    setErrorMsg('')

    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.verifyOtp({ type: type!, token_hash: token_hash! })
      if (error) throw error
      router.push(next)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      setStatus('ERROR')
      setErrorMsg(msg)
    }
  }

  return (
    <Wrapper>
      <CardContent className="pt-8 pb-8 text-center space-y-6">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-base">Reset Password</p>
          <p className="text-sm text-muted-foreground mt-1">
            Klik tombol di bawah untuk melanjutkan proses reset password Anda.
          </p>
        </div>
        {status === 'ERROR' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-left">
            {errorMsg}
          </div>
        )}
        <Button
          className="w-full"
          disabled={status === 'LOADING'}
          onClick={handleVerify}
        >
          {status === 'LOADING' ? 'Memverifikasi...' : 'Lanjutkan Reset Password'}
        </Button>
        <p className="text-sm text-gray-500">
          Link salah?{' '}
          <a href="/forgot-password" className="text-blue-600 font-medium hover:text-blue-700">
            Minta link baru
          </a>
        </p>
      </CardContent>
    </Wrapper>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <VerifyForm />
    </Suspense>
  )
}
