// components/superadmin/PolaIsianClient/PolaIsianClient.tabel.tsx
// Tabel daftar JENIS pola isian. Dibuat: Sesi #492.
//
// ⛔ NOL kelas `overflow` / `sticky` / `max-h` diketik di sini — rumahnya `components/ui/table.tsx`
//   (S5_PERILAKU_v2 §2A.1). ⛔ NOL angka piksel mati untuk lebar: satuan `ch` lewat token (§2A.5).
// ⛔ NOL hex mentah pada elemen BARU: warna dari CSS variable / TYPOGRAPHY (S2 + ATURAN 30).
// Kolom Aksi rata kanan dengan `stopPropagation` (S4 §10). Kolom Aktif & Aksi TIDAK sortable (S5 §3).

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TYPOGRAPHY }  from '@/lib/constants/ui-tokens.constant'
import { ICON_ACTION } from '@/lib/constants/icons.constant'
import type { FormFieldPolaRow } from '@/lib/types/form-field-pola.types'

const EditIcon   = ICON_ACTION.edit
const DeleteIcon = ICON_ACTION.delete

const SEL_SEKUNDER = 'text-[11px]'
const GAYA_SEKUNDER = { color: 'var(--color-text-secondary)' }

export function TabelPola({
  daftar,
  bukaSunting,
  geserAktif,
  hapus,
}: {
  daftar:      FormFieldPolaRow[]
  bukaSunting: (row: FormFieldPolaRow) => void
  geserAktif:  (row: FormFieldPolaRow) => void
  hapus:       (row: FormFieldPolaRow) => void
}) {
  if (daftar.length === 0) {
    return (
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-[13px]" style={GAYA_SEKUNDER}>
              Belum ada jenis pola. Tekan Tambah untuk membuat yang pertama.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={TYPOGRAPHY.tableHead} style={{ minWidth: 'var(--kolom-key-min)' }}>Jenis pola</TableHead>
          <TableHead className={TYPOGRAPHY.tableHead} style={{ minWidth: 'var(--kolom-teks-min)' }}>Ekspresi</TableHead>
          <TableHead className={TYPOGRAPHY.tableHead}>Berlaku</TableHead>
          <TableHead className={TYPOGRAPHY.tableHead}>Sumber</TableHead>
          <TableHead className={TYPOGRAPHY.tableHead} style={{ width: '8ch' }}>Aktif</TableHead>
          <TableHead className={`${TYPOGRAPHY.tableHead} text-right`} style={{ width: '12ch' }}>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {daftar.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="text-[13px]">{row.label}</span>
                <span className={`${SEL_SEKUNDER} font-mono`} style={GAYA_SEKUNDER}>{row.pola_key}</span>
              </div>
            </TableCell>
            <TableCell className="text-[12px] font-mono whitespace-normal">{row.ekspresi}</TableCell>
            <TableCell className={SEL_SEKUNDER} style={GAYA_SEKUNDER}>
              {row.effective_from}
              {row.effective_to ? ` — ${row.effective_to}` : ' — sekarang'}
            </TableCell>
            <TableCell className={`${SEL_SEKUNDER} whitespace-normal`} style={GAYA_SEKUNDER}>
              {row.sumber_nama ?? '—'}
            </TableCell>
            <TableCell>
              <Switch
                checked={row.is_active}
                onCheckedChange={() => geserAktif(row)}
                aria-label={`Saklar Aktif — ${row.label}`}
              />
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[12px] py-1 px-2.5"
                  onClick={() => bukaSunting(row)}
                  aria-label={`Sunting ${row.label}`}
                >
                  <EditIcon className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[12px] py-1 px-2.5"
                  disabled={row.is_system}
                  title={row.is_system ? 'Jenis bawaan tidak bisa dihapus — matikan saklarnya' : undefined}
                  onClick={() => hapus(row)}
                  aria-label={`Hapus ${row.label}`}
                >
                  <DeleteIcon className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
