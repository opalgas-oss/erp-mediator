// app/login/components/RoleSelectorStage.tsx
// UI tahap pilih role (ROLE) — untuk user dengan multi-role
// Dibuat: Sesi #049 — Step 5 TAHAP D

'use client'

import { Button }                             from '@/components/ui/button'
import { Badge }                              from '@/components/ui/badge'
import { Label }                              from '@/components/ui/label'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrapper, KotakError }                from './shared'

interface RoleSelectorStageProps {
  daftarRole:  string[]
  roleDipilih: string
  isLoading:   boolean
  error:       string
  gpsKota:     string | null
  onRoleChange: (role: string) => void
  onLanjut:     () => void
}

export function RoleSelectorStage(props: RoleSelectorStageProps) {
  const { daftarRole, roleDipilih, isLoading, error, gpsKota, onRoleChange, onLanjut } = props

  return (
    <Wrapper>
      <CardHeader>
        <CardTitle className="text-center text-base">Masuk Sebagai</CardTitle>
      </CardHeader>
      {gpsKota && (
        <div className="flex justify-end px-6 -mt-2 mb-0">
          <Badge variant="outline">📍 {gpsKota}</Badge>
        </div>
      )}
      <CardContent className="pb-6 space-y-4">
        {error && <KotakError pesan={error} />}
        <div>
          <Label htmlFor="pilihRole" className="text-sm text-muted-foreground mb-1.5 block">
            Pilih role untuk sesi ini
          </Label>
          <select id="pilihRole" value={roleDipilih} onChange={e => onRoleChange(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors">
            {daftarRole.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <Button className="w-full" disabled={isLoading || !roleDipilih} onClick={onLanjut}>
          {isLoading ? 'Memproses...' : 'Lanjut'}
        </Button>
      </CardContent>
    </Wrapper>
  )
}
