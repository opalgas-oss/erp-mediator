// app/login/components/OTPStage.tsx
// UI tahap verifikasi OTP
// Dibuat: Sesi #049 — Step 5 TAHAP D

'use client'

import { Button }                             from '@/components/ui/button'
import { Input }                              from '@/components/ui/input'
import { Label }                              from '@/components/ui/label'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrapper, KotakError }                from './shared'

interface OTPStageProps {
  otpInput:          string
  otpPercobaan:      number
  maxOtpPercobaan:   number
  hitunganMundur:    number
  isLoading:         boolean
  error:             string
  gpsKota:           string | null
  onOtpChange:       (v: string) => void
  onVerifikasi:      () => void
  onKirimUlang:      () => void
}

export function OTPStage(props: OTPStageProps) {
  const {
    otpInput, otpPercobaan, maxOtpPercobaan, hitunganMundur,
    isLoading, error, gpsKota, onOtpChange, onVerifikasi, onKirimUlang,
  } = props

  const batasPercobaan = otpPercobaan >= maxOtpPercobaan

  return (
    <Wrapper>
      <CardHeader>
        <CardTitle className="text-center text-lg font-semibold text-gray-900">Verifikasi OTP</CardTitle>
        <p className="text-sm text-muted-foreground text-center">ERP Mediator Hyperlocal</p>
      </CardHeader>
      <CardContent className="pb-6 space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Kode OTP telah dikirim ke WhatsApp Anda.
        </p>
        {error && <KotakError pesan={error} />}
        <div>
          <Label htmlFor="inputOTP" className="text-sm text-gray-600 mb-1.5 block">
            Kode OTP (6 digit)
          </Label>
          <Input id="inputOTP" type="text" inputMode="numeric" maxLength={6}
            value={otpInput}
            onChange={e => onOtpChange(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && onVerifikasi()}
            disabled={isLoading || batasPercobaan}
            placeholder="000000"
            className="text-center text-lg tracking-widest" />
        </div>
        <Button className="w-full"
          disabled={isLoading || otpInput.length !== 6 || batasPercobaan}
          onClick={onVerifikasi}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Memverifikasi...
            </span>
          ) : 'Verifikasi OTP'}
        </Button>
        {hitunganMundur > 0
          ? <p className="text-xs text-center text-muted-foreground">
              Kirim ulang dalam {hitunganMundur} detik
            </p>
          : <Button variant="ghost" className="w-full text-sm"
              disabled={isLoading} onClick={onKirimUlang}>
              Kirim Ulang
            </Button>
        }
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
