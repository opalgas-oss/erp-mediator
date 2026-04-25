// app/login/page.tsx
// Orchestrator halaman login — < 50 baris
// Semua logic ada di lib/hooks/useLoginFlow.ts
// Semua UI ada di app/login/components/*.tsx
//
// REFACTOR Sesi #049 — Step 5 ANALISIS v3:
//   Sebelumnya: 39.27 KB monolith (700+ baris)
//   Sekarang:   orchestrator yang import hook + render stage component
//
// REFACTOR Sesi #062:
//   BiometricStage dihapus dari login flow (keputusan Philips Sesi #061).
//   Login post-OTP langsung masuk dashboard via selesaiLogin() di hook.

'use client'

import { Suspense }           from 'react'
import { useLoginFlow }       from '@/lib/hooks/useLoginFlow'
import { Wrapper, SpinnerBiru } from './components/shared'
import { CardContent }        from '@/components/ui/card'
import { LoginFormStage }     from './components/LoginFormStage'
import { SesiParalelStage }   from './components/SesiParalelStage'
import { RoleSelectorStage }  from './components/RoleSelectorStage'
import { OTPStage }           from './components/OTPStage'

function LoginOrchestrator() {
  const flow = useLoginFlow()

  // Loading / Selesai — spinner
  if (flow.tahap === 'LOADING' || flow.tahap === 'SELESAI') {
    return (
      <Wrapper>
        <CardContent className="pt-6 pb-6 text-center">
          <SpinnerBiru />
          <p className="text-sm text-muted-foreground">
            {flow.tahap === 'SELESAI' ? 'Masuk ke dashboard...' : 'Memverifikasi...'}
          </p>
        </CardContent>
      </Wrapper>
    )
  }

  if (flow.tahap === 'SESI_PARALEL')
    return <SesiParalelStage sesiParalel={flow.sesiParalel} m={flow.m} onKembali={flow.handleKembaliDariSesiParalel} />

  if (flow.tahap === 'ROLE')
    return <RoleSelectorStage daftarRole={flow.daftarRole} roleDipilih={flow.roleDipilih} isLoading={flow.isLoading}
      error={flow.error} gpsKota={flow.gpsKota} onRoleChange={flow.setRoleDipilih} onLanjut={flow.handlePilihRole} />

  if (flow.tahap === 'OTP')
    return <OTPStage otpInput={flow.otpInput} otpPercobaan={flow.otpPercobaan} maxOtpPercobaan={flow.maxOtpPercobaan}
      hitunganMundur={flow.hitunganMundur} isLoading={flow.isLoading} error={flow.error} gpsKota={flow.gpsKota}
      onOtpChange={flow.setOtpInput} onVerifikasi={flow.handleVerifikasiOTP} onKirimUlang={flow.handleKirimUlangOTP} />

  // Default: KREDENSIAL — form email + password
  return <LoginFormStage email={flow.email} password={flow.password} tampilPassword={flow.tampilPassword}
    errorEmail={flow.errorEmail} errorPassword={flow.errorPassword} isLoading={flow.isLoading}
    error={flow.error} akunDikunci={flow.akunDikunci} waktuKunci={flow.waktuKunci} gpsKota={flow.gpsKota}
    onEmailChange={v => { flow.setEmail(v); flow.setErrorEmail('') }}
    onPasswordChange={v => { flow.setPassword(v); flow.setErrorPassword('') }}
    onTogglePassword={flow.togglePassword} onLogin={flow.handleLogin} />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginOrchestrator />
    </Suspense>
  )
}
