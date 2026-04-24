// app/login/components/SesiParalelStage.tsx
// UI tahap concurrent session warning (SESI_PARALEL)
// Dibuat: Sesi #049 — Step 5 TAHAP D

'use client'

import { Button }                             from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrapper }                            from './shared'
import { formatWaktuLogin }                   from '../login-types'
import type { DataSesiParalel }               from '../login-types'

interface SesiParalelStageProps {
  sesiParalel: DataSesiParalel | null
  m:           (key: string, vars?: Record<string, string>) => string
  onKembali:   () => void
}

export function SesiParalelStage({ sesiParalel, m, onKembali }: SesiParalelStageProps) {
  const device = sesiParalel?.device   || 'perangkat tidak diketahui'
  const kota   = sesiParalel?.gps_kota || 'lokasi tidak diketahui'
  const waktu  = formatWaktuLogin(sesiParalel?.login_at)

  return (
    <Wrapper>
      <CardHeader>
        <CardTitle className="text-center text-base">{m('session_paralel_title')}</CardTitle>
      </CardHeader>
      <CardContent className="pb-6 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          {m('session_paralel_info', { device, kota, waktu })}
        </div>
        <p className="text-sm text-muted-foreground text-center">{m('session_paralel_sub')}</p>
        <Button variant="outline" className="w-full" onClick={onKembali}>
          {m('session_paralel_kembali')}
        </Button>
      </CardContent>
    </Wrapper>
  )
}
