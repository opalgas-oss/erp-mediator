// app/kelola/masuk/page.tsx
// Pintu Login AdminTenant — BLUEPRINT_LOGIN_4_PINTU_v1 Langkah 2d
// Dibuat: CASE SESI-25 — 10 Juni 2026
//
// Pintu ini KHUSUS untuk AdminTenant.
// Tidak ditautkan dari homepage publik (BR-03 — keamanan).
// URL Opsi A: /kelola/masuk
//
// Clone verbatim dari app/login/page.tsx dengan perbedaan:
//   1. Header komentar + identitas pintu
//   2. useLoginFlow menerima doorRole='admin_tenant' (saat hook siap)
//      Saat ini hook belum diupdate — akan dikerjakan saat HUTANG-SPLIT-USELOGINFLOW
//   3. Setelah login berhasil → redirect ke /dashboard/admintenant (via hitungTujuanRedirectServer)
//      CATATAN: hitungTujuanRedirectServer masih redirect ke /dashboard/admin (salah).
//      Fix redirect path dikerjakan bersama middleware update (BLUEPRINT-LOGIN-4-PINTU Langkah 2f).
//
// Komponen UI sepenuhnya reuse dari app/login/components/ (TDD Bagian 5.1 + 5.3)

'use client'

import { Suspense }           from 'react'
import React                  from 'react'
import { useLoginFlow }       from '@/lib/hooks/useLoginFlow'
import { Wrapper, SpinnerBiru } from '@/app/login/components/shared'
import { CardContent }        from '@/components/ui/card'
import { LoginFormStage }     from '@/app/login/components/LoginFormStage'
import { SesiParalelStage }   from '@/app/login/components/SesiParalelStage'
import { RoleSelectorStage }  from '@/app/login/components/RoleSelectorStage'
import { OTPStage }           from '@/app/login/components/OTPStage'
import { LoginFormOtpOnly }   from '@/app/login/components/LoginFormOtpOnly'
import { StatusRegistrasiModal } from '@/app/login/components/StatusRegistrasiModal'

function LoginOrchestrator() {
  const flow = useLoginFlow()

  // Tentukan konten stage aktif sebagai variabel — modal harus bisa tampil di semua tahap
  // HUTANG-LOGIN-STATUS-POPUP S#213: StatusRegistrasiModal dirender di luar conditional stage
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
    // otp_only mode: tampilkan form nomor HP sebagai pengganti password (S#209)
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
    // Default: KREDENSIAL — form email + password
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

export default function LoginAdminTenantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginOrchestrator />
    </Suspense>
  )
}
