// app/login/components/BiometricStage.tsx
// UI tahap biometric registration/verification
// Dibuat: Sesi #049 — Step 5 TAHAP D

'use client'

import { Button }                             from '@/components/ui/button'
import { Badge }                              from '@/components/ui/badge'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrapper, KotakError }                from './shared'

interface BiometricStageProps {
  isLoading: boolean
  error:     string
  gpsKota:   string | null
  onAktifkan: () => void
  onLewati:   () => void
}

export function BiometricStage(props: BiometricStageProps) {
  const { isLoading, error, gpsKota, onAktifkan, onLewati } = props

  return (
    <Wrapper>
      <CardHeader>
        <CardTitle className="text-center text-base">Aktifkan Biometric</CardTitle>
      </CardHeader>
      {gpsKota && (
        <div className="flex justify-end px-6 -mt-2 mb-0">
          <Badge variant="outline">📍 {gpsKota}</Badge>
        </div>
      )}
      <CardContent className="pb-6 space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Aktifkan biometric untuk login berikutnya lebih cepat dan aman.
        </p>
        {error && <KotakError pesan={error} />}
        <Button className="w-full" disabled={isLoading} onClick={onAktifkan}>
          {isLoading ? 'Memproses...' : 'Aktifkan Biometric'}
        </Button>
        <Button variant="ghost" className="w-full text-sm" disabled={isLoading} onClick={onLewati}>
          Lewati
        </Button>
      </CardContent>
    </Wrapper>
  )
}
