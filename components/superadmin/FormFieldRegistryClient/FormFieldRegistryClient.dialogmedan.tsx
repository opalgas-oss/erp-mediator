// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.dialogmedan.tsx
// Medan dasar dialog Sunting: satu label + satu kontrol + satu baris bantuan.
// Dibuat: Sesi #493 — butir 1b. Dipakai `.dialog.tsx` DAN `.dialogpola.tsx`.
//
// Bentuknya mengikuti `PolaIsianClient.dialog.tsx` yang sudah berdiri: `TYPOGRAPHY.label`
// (S1 §1.2) + `Input` shadcn + bantuan 11px `--color-text-secondary` (S1 caption, S2).
//
// ⛔ PEMILIH memakai `<select>` bawaan, BUKAN `Select` shadcn — dan sebabnya sama dengan
//   K-492-T7: mockup v3 yang Philips SETUJUI menggambar kotak pilihan biasa, dan
//   ATURAN 55.2/55.4 melarang mengubah tampilan yang sudah disetujui tanpa kalimat yang
//   membukanya. Preseden di dalam repo sendiri: `components/register/KolomFormulir.tsx`
//   merender `select` bawaan untuk kolom bertipe pilihan. Alasan kedua: `Select` shadcn
//   berbasis portal Radix dan tidak bisa diuji Claude sendiri lewat DOM (batas #107),
//   sedangkan `select` bawaan bisa.

import { Input } from '@/components/ui/input'
import { TYPOGRAPHY } from '@/lib/constants/ui-tokens.constant'

const GAYA_SEKUNDER = { color: 'var(--color-text-secondary)' }

/** Kotak pilihan — disamakan tingginya dengan `Input` shadcn supaya sebaris di dua kolom. */
const KOTAK_PILIH =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none ' +
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function SubJudul({ isi }: { isi: string }) {
  return <div className="text-sm font-medium text-slate-800 pt-1">{isi}</div>
}

export function Bantuan({ isi }: { isi: string }) {
  return <span className="text-[11px]" style={GAYA_SEKUNDER}>{isi}</span>
}

export function MedanTeks({
  id, judul, nilai, ubah, tipe = 'text', petunjuk, contoh,
}: {
  id:        string
  judul:     string
  nilai:     string
  ubah:      (nilai: string) => void
  tipe?:     string
  petunjuk?: string
  contoh?:   string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={TYPOGRAPHY.label} htmlFor={id}>{judul}</label>
      <Input id={id} type={tipe} value={nilai} placeholder={contoh} onChange={e => ubah(e.target.value)} />
      {petunjuk ? <Bantuan isi={petunjuk} /> : null}
    </div>
  )
}

export function MedanPilih({
  id, judul, nilai, ubah, opsi, petunjuk,
}: {
  id:        string
  judul:     string
  nilai:     string
  ubah:      (nilai: string) => void
  opsi:      { nilai: string; label: string }[]
  petunjuk?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={TYPOGRAPHY.label} htmlFor={id}>{judul}</label>
      <select id={id} className={KOTAK_PILIH} value={nilai} onChange={e => ubah(e.target.value)}>
        {opsi.map(o => <option key={o.nilai} value={o.nilai}>{o.label}</option>)}
      </select>
      {petunjuk ? <Bantuan isi={petunjuk} /> : null}
    </div>
  )
}
