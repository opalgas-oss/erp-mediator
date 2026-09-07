'use client'

// components/superadmin/PolaIsianClient/PolaIsianClient.tsx
// Layar SuperAdmin "Pola Isian" — katalog JENIS pola yang boleh dipakai kolom formulir.
// Dibuat: Sesi #492 — K-488-T1b.
//
// 🔴 INILAH YANG MEMBUAT UJI ATURAN 8.2 BUTIR 7 TERJAWAB **IYA**: penerbit mengeluarkan format
//   baru bulan depan sementara yang lama masih beredar ⇒ SA menambahkannya sendiri dari layar
//   ini, tanpa programmer, tanpa migrasi, dan tanpa isian lama menjadi tidak sah.
// ⛔ Jenis bawaan (`is_system`) TIDAK bisa dihapus, tetapi TETAP bisa disunting dan dimatikan —
//   `is_system` adalah PENANDA, bukan kunci (K-483-4).

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TYPOGRAPHY }  from '@/lib/constants/ui-tokens.constant'
import { ICON_ACTION } from '@/lib/constants/icons.constant'
import { usePolaIsian }   from './PolaIsianClient.hook'
import { TabelPola }      from './PolaIsianClient.tabel'
import { DialogPola }     from './PolaIsianClient.dialog'
import type { PolaIsianClientProps } from './PolaIsianClient.kontrak'

const AddIcon = ICON_ACTION.add

export function PolaIsianClient({ initialData }: PolaIsianClientProps) {
  const {
    daftar, dialogBuka, setDialogBuka, form, ubah, menyimpan,
    bukaTambah, bukaSunting, simpan, geserAktif, hapus,
  } = usePolaIsian({ initialData })

  const jumlahAktif = daftar.filter((p) => p.is_active).length

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pt-2 pb-1 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className={TYPOGRAPHY.cardTitle}>Jenis Pola Isian</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">
                {daftar.length} jenis · {jumlahAktif} aktif
              </Badge>
              <Button size="sm" className="text-[12px] py-1 px-2.5" onClick={bukaTambah}>
                <AddIcon className="w-3.5 h-3.5 mr-1.5" />
                Tambah
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1 pb-2 px-0">
          <TabelPola
            daftar={daftar}
            bukaSunting={bukaSunting}
            geserAktif={geserAktif}
            hapus={hapus}
          />
        </CardContent>
      </Card>

      <DialogPola
        buka={dialogBuka}
        setBuka={setDialogBuka}
        form={form}
        ubah={ubah}
        menyimpan={menyimpan}
        simpan={simpan}
      />
    </div>
  )
}
