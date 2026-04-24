// app/login/components/OTPStage.tsx
// UI tahap verifikasi OTP
// Dibuat: Sesi #049 — Step 5 TAHAP D

'use client'

import { Button }                             from '@/components/ui/button'
import { Input }                              from '@/components/ui/input'
import { Badge }                              from '@/components/ui/badge'
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
        <CardTitle className="text-center text-base">Verifikasi OTP</CardTitle>
      </CardHeader>
      {gpsKota && (
        <div className="flex justify-end px-6 -mt-2 mb-0">
          <Badge variant="outline">📍 {gpsKota}</Badge>
        </div>
      )}
      <CardContent className="pb-6 space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Kode OTP telah dikirim ke WhatsApp Anda.
        </p>
        {error && <KotakError pesan={error} />}
        <div>
          <Label htmlFor="inputOTP" className="text-sm text-muted-foreground mb-1.5 block">
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
          {isLoading ? 'Memverifikasi...' : 'Verifikasi OTP'}
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
      </CardContent>
    </Wrapper>
  )
}
