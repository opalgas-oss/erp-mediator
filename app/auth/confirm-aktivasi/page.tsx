'use client'

// app/auth/confirm-aktivasi/page.tsx
// Halaman konfirmasi aktivasi AdminTenant — JALUR AKTIVASI (terpisah dari /auth/verify reset password).
//
// Alur:
//   1. Email aktivasi berisi link → /auth/confirm-aktivasi?token_hash=xxx&type=recovery&next=/aktivasi
//   2. Halaman tampilkan tombol manual "Aktifkan Akun Sekarang"
//      (TOMBOL MANUAL wajib — cegah Gmail/email scanner consume token saat preview link)
//   3. User klik → verifyOtp({ token_hash, type: 'recovery' }) di client → set session (cookie storage @supabase/ssr)
//   4. Redirect ke /aktivasi → halaman buat password (session sudah ada)
//
// KENAPA token_hash, BUKAN #access_token fragment:
//   @supabase/ssr pakai PKCE flow. action_link generateLink (implicit/fragment) ditolak client PKCE.
//   token_hash + verifyOtp bekerja di client PKCE tanpa butuh code_verifier. Ini pola resmi SSR.
//
// KENAPA path /auth/confirm-aktivasi terpisah dari /auth/verify:
//   /auth/verify = jalur reset password (user lupa password, sudah aktif).
//   /auth/confirm-aktivasi = jalur aktivasi akun AT baru (belum punya password).
//   Walau Supabase pakai type=recovery untuk keduanya, PATH yang membedakan UX + teks.
//   Tidak ada collision saat fitur Lupa Password AT dibuat nanti.
//
// Dibuat: Sesi #252b — ROOT CAUSE FIX HUTANG-AKTIVASI-PAGE
// Referensi: Research Supabase PKCE+generateLink S#252, pola app/auth/verify/page.tsx

import { useState, Suspense }            from 'react'
import { useRouter, useSearchParams }    from 'next/navigation'
import { type EmailOtpType }             from '@supabase/supabase-js'
import { createBrowserSupabaseClient }   from '@/lib/supabase-client'
import { Button }                        from '@/components/ui/button'
import { Card, CardContent }             from '@/components/ui/card'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  )
}

function ConfirmAktivasiForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus]     = useState<'IDLE' | 'LOADING' | 'ERROR'>('IDLE')
  const [errorMsg, setErrorMsg] = useState('')

  const token_hash = searchParams.get('token_hash')
  const type       = (searchParams.get('type') ?? 'recovery') as EmailOtpType
  const next       = searchParams.get('next') ?? '/aktivasi'

  // Token tidak ada → link rusak
  if (!token_hash) {
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
              Link aktivasi tidak lengkap. Hubungi Admin untuk mendapatkan link baru.
            </p>
          </div>
        </CardContent>
      </Wrapper>
    )
  }

  async function handleAktivasi() {
    setStatus('LOADING')
    setErrorMsg('')
    try {
      const supabase = createBrowserSupabaseClient()
      // verifyOtp set session via cookie storage (@supabase/ssr) — PKCE-safe, tanpa code_verifier
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: token_hash! })
      if (error) throw error
      // Session sudah di-set → lanjut ke halaman buat password
      router.push(next)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      setStatus('ERROR')
      // Pesan error ramah: token expired vs error lain
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('Token has expired')) {
        setErrorMsg('Link aktivasi sudah kadaluarsa. Hubungi Admin untuk mendapatkan link baru.')
      } else {
        setErrorMsg('Gagal memproses aktivasi. Hubungi Admin untuk link baru.')
      }
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
          <p className="font-semibold text-gray-900 text-base">Aktivasi Akun Admin Tenant</p>
          <p className="text-sm text-muted-foreground mt-1">
            Klik tombol di bawah untuk melanjutkan aktivasi dan membuat password akun Anda.
          </p>
        </div>
        {status === 'ERROR' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 text-left">
            {errorMsg}
          </div>
        )}
        <Button className="w-full" disabled={status === 'LOADING'} onClick={handleAktivasi}>
          {status === 'LOADING' ? 'Memproses...' : 'Aktifkan Akun Sekarang'}
        </Button>
      </CardContent>
    </Wrapper>
  )
}

export default function ConfirmAktivasiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <ConfirmAktivasiForm />
    </Suspense>
  )
}
