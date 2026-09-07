// components/superadmin/PolaIsianClient/PolaIsianClient.dialog.tsx
// Dialog tambah / sunting satu JENIS pola. Dibuat: Sesi #492.
//
// Lebar `sm:max-w-lg` — form sedang, S4 §7. Isi panjang bergulir di `max-h-[65vh]` (S5 §2).
// Kaki: Batal `ghost` + Simpan `default` (S4 §7). Label form memakai TYPOGRAPHY.label (S1 §1.2).
// ⛔ Nol penjagaan bentuk ekspresi di sini — penjaganya SATU, di server.

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TYPOGRAPHY }  from '@/lib/constants/ui-tokens.constant'
import { ICON_STATUS } from '@/lib/constants/icons.constant'
import type { FormPola } from './PolaIsianClient.kontrak'

const LoadingIcon = ICON_STATUS.loading
const GAYA_SEKUNDER = { color: 'var(--color-text-secondary)' }

function Medan({
  nama, judul, nilai, ubah, tipe = 'text', petunjuk, matikan = false,
}: {
  nama:      keyof FormPola
  judul:     string
  nilai:     string
  ubah:      (medan: keyof FormPola, nilai: string) => void
  tipe?:     string
  petunjuk?: string
  matikan?:  boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={TYPOGRAPHY.label} htmlFor={`pola-${String(nama)}`}>{judul}</label>
      <Input
        id={`pola-${String(nama)}`}
        type={tipe}
        value={nilai}
        disabled={matikan}
        onChange={(e) => ubah(nama, e.target.value)}
      />
      {petunjuk ? <span className="text-[11px]" style={GAYA_SEKUNDER}>{petunjuk}</span> : null}
    </div>
  )
}

export function DialogPola({
  buka, setBuka, form, ubah, menyimpan, simpan,
}: {
  buka:      boolean
  setBuka:   (v: boolean) => void
  form:      FormPola
  ubah:      (medan: keyof FormPola, nilai: string) => void
  menyimpan: boolean
  simpan:    () => void
}) {
  const baru = form.id === null

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{baru ? 'Tambah jenis pola' : 'Sunting jenis pola'}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto flex flex-col gap-4 p-5">
          <Medan
            nama="pola_key" judul="Kunci pola" nilai={form.pola_key} ubah={ubah} matikan={!baru}
            petunjuk={baru
              ? 'Huruf kecil, angka, dan garis bawah. Contoh: angka_panjang_tetap'
              : 'Kunci tidak bisa diubah — ia dirujuk kolom formulir yang sudah ada.'}
          />
          <Medan nama="label" judul="Nama yang Anda baca" nilai={form.label} ubah={ubah} />
          <Medan nama="deskripsi" judul="Penjelasan" nilai={form.deskripsi} ubah={ubah} />
          <Medan
            nama="ekspresi" judul="Ekspresi" nilai={form.ekspresi} ubah={ubah}
            petunjuk="Nama parameter dibatasi tanda persen. Contoh: ^[0-9]{%panjang%}$"
          />
          <Medan
            nama="pesan_galat" judul="Pesan bila isian tidak cocok" nilai={form.pesan_galat} ubah={ubah}
            petunjuk="{label} diisi nama kolom; parameter ditulis dengan %nama%."
          />
          <Medan nama="contoh" judul="Contoh isian yang sah" nilai={form.contoh} ubah={ubah} />
          <div className="grid grid-cols-2 gap-4">
            <Medan nama="effective_from" judul="Berlaku sejak" nilai={form.effective_from} ubah={ubah} tipe="date" />
            <Medan
              nama="effective_to" judul="Berlaku sampai" nilai={form.effective_to} ubah={ubah} tipe="date"
              petunjuk="Kosong = masih berlaku"
            />
          </div>
          <Medan nama="sumber_nama" judul="Sumber" nilai={form.sumber_nama} ubah={ubah} />
          <div className="grid grid-cols-2 gap-4">
            <Medan nama="sumber_url" judul="Tautan sumber" nilai={form.sumber_url} ubah={ubah} />
            <Medan nama="sumber_tanggal" judul="Tanggal sumber" nilai={form.sumber_tanggal} ubah={ubah} tipe="date" />
          </div>
        </div>

        <DialogFooter className="px-5 py-3.5">
          <Button variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
          <Button onClick={simpan} disabled={menyimpan}>
            {menyimpan ? <LoadingIcon className="w-4 h-4 mr-2 animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
