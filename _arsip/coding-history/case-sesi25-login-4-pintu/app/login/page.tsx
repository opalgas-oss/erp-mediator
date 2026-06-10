// ARSIP — app/login/page.tsx
// Snapshot sebelum pemisahan login 4 pintu (CASE SESI-25, 10 Juni 2026)
// Alasan arsip: app/login/page.tsx diarsipkan setelah pintu SA (app/sa/masuk/)
// dan pintu AT (app/kelola/masuk/) dibuat. File asli diganti placeholder redirect.
// ─────────────────────────────────────────────────────────────────────────────

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
import React                  from 'react'
import { useLoginFlow }       from '@/lib/hooks/useLoginFlow'
import { Wrapper, SpinnerBiru } from './components/shared'
import { CardContent }        from '@/components/ui/card'
import { LoginFormStage }     from './components/LoginFormStage'
import { SesiParalelStage }   from './components/SesiParalelStage'
import { RoleSelectorStage }  from './components/RoleSelectorStage'
import { OTPStage }           from './components/OTPStage'
import { LoginFormOtpOnly }   from './components/LoginFormOtpOnly'
import { StatusRegistrasiModal } from './components/StatusRegistrasiModal'

function LoginOrchestrator() {
  const flow = useLoginFlow()

  let konten: React.ReactNode

  if (flow.tahap === 'LOADING' || flow.tahap === 'SELESAI') {
    konten = (
      <Wrapper>
        <CardContent className="pt-6 pb-6 text-center">
          <SpinnerBiru />
          <p className="text-sm text-muted-foreground">
            {flow.tahap === 'SELESAI' ? 'Masuk ke dashboard...' : 'Memverifikasi...'}
          </p>
        </CardContent>
      </Wrapper>
    )
  } else if (flow.tahap === 'SESI_PARALEL') {
    konten = <SesiParalelStage sesiParalel={flow.sesiParalel} m={flow.m} onKembali={flow.handleKembaliDariSesiParalel} />
  } else if (flow.tahap === 'ROLE') {
    konten = <RoleSelectorStage daftarRole={flow.daftarRole} roleDipilih={flow.roleDipilih} isLoading={flow.isLoading}
      error={flow.error} gpsKota={flow.gpsKota} onRoleChange={flow.setRoleDipilih} onLanjut={flow.handlePilihRole}
      m={flow.m} />
  } else if (flow.tahap === 'OTP') {
    konten = <OTPStage otpInput={flow.otpInput} otpPercobaan={flow.otpPercobaan} maxOtpPercobaan={flow.maxOtpPercobaan}
      hitunganMundur={flow.hitunganMundur} isLoading={flow.isLoading} error={flow.error} gpsKota={flow.gpsKota}
      onOtpChange={flow.setOtpInput} onVerifikasi={flow.handleVerifikasiOTP} onKirimUlang={flow.handleKirimUlangOTP}
      m={flow.m} />
  } else if (flow.isOtpOnlyMode && flow.tahap === 'KREDENSIAL') {
    konten = <LoginFormOtpOnly
      nomorHp={flow.nomorHp}
      isLoading={flow.isLoading}
      error={flow.error}
      onNomorHpChange={flow.setNomorHp}
      onKirimOTP={flow.handleKirimOtpOnly}
      onMasukPassword={() => { flow.setIsOtpOnlyMode(false); flow.setError('') }}
      m={flow.m}
    />
  } else {
    konten = <LoginFormStage email={flow.email} password={flow.password} tampilPassword={flow.tampilPassword}
      errorEmail={flow.errorEmail} errorPassword={flow.errorPassword} isLoading={flow.isLoading}
      error={flow.error} akunDikunci={flow.akunDikunci} waktuKunci={flow.waktuKunci} gpsKota={flow.gpsKota}
      onEmailChange={v => { flow.setEmail(v); flow.setErrorEmail('') }}
      onPasswordChange={v => { flow.setPassword(v); flow.setErrorPassword('') }}
      onTogglePassword={flow.togglePassword} onLogin={flow.handleLogin} m={flow.m}
      onMasukOtpOnly={flow.showWaOtpLink ? () => { flow.setIsOtpOnlyMode(true); flow.setError('') } : undefined} />
  }

  return (
    <>
      {konten}
      <StatusRegistrasiModal
        data={flow.statusPopup}
        m={flow.m}
        onTutup={() => flow.setStatusPopup(null)}
      />
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginOrchestrator />
    </Suspense>
  )
}
