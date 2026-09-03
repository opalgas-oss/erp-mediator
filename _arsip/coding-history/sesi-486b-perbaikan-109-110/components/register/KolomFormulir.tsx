'use client'

// components/register/KolomFormulir.tsx
// Merender SATU kolom formulir apa adanya menurut Field Registry. Dibuat: Sesi #486.
//
// 🔴 Komponen ini TIDAK tahu kolom apa yang ada. Ia hanya tahu `tipe_input`.
//   Menambah kolom pendaftaran = menambah baris di form_field_registry, ⛔ bukan menyentuh berkas ini.
// ⚠️ `file` / `image` sengaja TIDAK dirender di Tahap 1 (belum ada penyimpanan berkas) —
//   penyaringannya di server (vendor-register.service), jadi kolom itu tidak pernah sampai ke sini.

import { useState } from 'react'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label }    from '@/components/ui/label'
import { TYPOGRAPHY } from '@/lib/constants/ui-tokens.constant'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import type { NilaiJawaban, OpsiPilihan } from '@/lib/types/vendor-register.types'

interface Props {
  kolom:    FormFieldRow
  opsi:     OpsiPilihan[]
  nilai:    NilaiJawaban
  galat?:   string
  onUbah:   (fieldKey: string, nilai: NilaiJawaban) => void
}

const KOTAK = 'rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-[13px] w-full'

function PilihBanyak({ kolom, opsi, terpilih, onUbah }: {
  kolom: FormFieldRow; opsi: OpsiPilihan[]; terpilih: string[]
  onUbah: (nilai: string[]) => void
}) {
  const [cari, setCari] = useState('')
  const tersaring = cari.trim().length === 0
    ? opsi
    : opsi.filter((o) => o.label.toLowerCase().includes(cari.trim().toLowerCase()))

  const alih = (nilai: string): void => {
    onUbah(terpilih.includes(nilai) ? terpilih.filter((n) => n !== nilai) : [...terpilih, nilai])
  }

  return (
    <div className="rounded-md border border-[#d1d5db] bg-white">
      <div className="p-2 border-b border-[#f3f4f6]">
        <input
          type="text"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari..."
          className="w-full px-2 py-1 text-[13px] outline-none"
          aria-label={`Cari ${kolom.label}`}
        />
      </div>
      <div className="max-h-44 overflow-y-auto p-2 flex flex-col gap-1">
        {tersaring.length === 0 && (
          <span className={TYPOGRAPHY.caption}>Tidak ada pilihan yang cocok</span>
        )}
        {tersaring.slice(0, 200).map((o) => (
          <label key={o.nilai} className="flex items-center gap-2 text-[13px] cursor-pointer">
            <input
              type="checkbox"
              checked={terpilih.includes(o.nilai)}
              onChange={() => alih(o.nilai)}
              className="h-4 w-4"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {terpilih.length > 0 && (
        <div className="px-2 py-1 border-t border-[#f3f4f6]">
          <span className={TYPOGRAPHY.caption}>{terpilih.length} dipilih</span>
        </div>
      )}
    </div>
  )
}

export function KolomFormulir({ kolom, opsi, nilai, galat, onUbah }: Props) {
  const id = `kolom-${kolom.field_key}`

  const isi = (): React.ReactNode => {
    switch (kolom.tipe_input) {
      case 'textarea':
        return (
          <Textarea
            id={id}
            value={typeof nilai === 'string' ? nilai : ''}
            placeholder={kolom.placeholder ?? ''}
            onChange={(e) => onUbah(kolom.field_key, e.target.value)}
          />
        )
      case 'boolean':
        return (
          <label className="flex items-start gap-2 text-[13px] cursor-pointer">
            <input
              id={id}
              type="checkbox"
              checked={nilai === true}
              onChange={(e) => onUbah(kolom.field_key, e.target.checked)}
              className="h-4 w-4 mt-0.5"
            />
            <span>{kolom.deskripsi ?? kolom.label}</span>
          </label>
        )
      case 'select':
        return (
          <select
            id={id}
            value={typeof nilai === 'string' ? nilai : ''}
            onChange={(e) => onUbah(kolom.field_key, e.target.value)}
            className={KOTAK}
          >
            <option value="">{kolom.placeholder ?? 'Pilih...'}</option>
            {opsi.map((o) => <option key={o.nilai} value={o.nilai}>{o.label}</option>)}
          </select>
        )
      case 'multiselect':
        return (
          <PilihBanyak
            kolom={kolom}
            opsi={opsi}
            terpilih={Array.isArray(nilai) ? nilai : []}
            onUbah={(baru) => onUbah(kolom.field_key, baru)}
          />
        )
      case 'number':
      case 'date':
      default:
        return (
          <Input
            id={id}
            type={kolom.tipe_input === 'number' ? 'number' : kolom.tipe_input === 'date' ? 'date' : 'text'}
            value={typeof nilai === 'string' ? nilai : ''}
            placeholder={kolom.placeholder ?? ''}
            onChange={(e) => onUbah(kolom.field_key, e.target.value)}
          />
        )
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {kolom.tipe_input !== 'boolean' && (
        <Label htmlFor={id} className={TYPOGRAPHY.label}>
          {kolom.label}
          {kolom.is_required && <span className="text-[#A32D2D]"> *</span>}
        </Label>
      )}
      {isi()}
      {kolom.deskripsi && kolom.tipe_input !== 'boolean' && (
        <span className={TYPOGRAPHY.caption}>{kolom.deskripsi}</span>
      )}
      {galat && <span className={TYPOGRAPHY.error}>{galat}</span>}
    </div>
  )
}
