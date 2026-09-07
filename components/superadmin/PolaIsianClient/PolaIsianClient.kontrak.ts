// components/superadmin/PolaIsianClient/PolaIsianClient.kontrak.ts
// Bentuk data layar "Pola Isian" (SuperAdmin). Dibuat: Sesi #492 — K-488-T1b.
//
// Sumbu klaster (ATURAN 50.5): bentuk data di sini · keadaan di `.hook.ts` ·
//   tabel + dialog di `.subcomponents.tsx` · kerangka di induk.

import type { FormFieldPolaRow } from '@/lib/types/form-field-pola.types'

export interface PolaIsianClientProps {
  /** SELURUH jenis pola, termasuk yang dimatikan — PRINSIP MULTI-TENANT butir 13. */
  initialData: FormFieldPolaRow[]
}

/** Isi dialog. Seluruh medan bertipe teks: dialog TIDAK menebak tipe, server yang menguji. */
export interface FormPola {
  id:             string | null
  pola_key:       string
  label:          string
  deskripsi:      string
  jenis_ekspresi: 'regex' | 'mask'
  ekspresi:       string
  contoh:         string
  pesan_galat:    string
  effective_from: string
  effective_to:   string
  sumber_nama:    string
  sumber_url:     string
  sumber_tanggal: string
}

export const FORM_KOSONG: FormPola = {
  id: null, pola_key: '', label: '', deskripsi: '',
  jenis_ekspresi: 'regex', ekspresi: '', contoh: '', pesan_galat: '',
  effective_from: '', effective_to: '', sumber_nama: '', sumber_url: '', sumber_tanggal: '',
}

/** Baris tabel → isi dialog. Nilai kosong di DB menjadi string kosong, ⛔ bukan "null". */
export function keForm(row: FormFieldPolaRow): FormPola {
  return {
    id:             row.id,
    pola_key:       row.pola_key,
    label:          row.label,
    deskripsi:      row.deskripsi ?? '',
    jenis_ekspresi: row.jenis_ekspresi,
    ekspresi:       row.ekspresi,
    contoh:         row.contoh ?? '',
    pesan_galat:    row.pesan_galat,
    effective_from: row.effective_from ?? '',
    effective_to:   row.effective_to ?? '',
    sumber_nama:    row.sumber_nama ?? '',
    sumber_url:     row.sumber_url ?? '',
    sumber_tanggal: row.sumber_tanggal ?? '',
  }
}

/** Isi dialog → muatan rute. String kosong menjadi `null`, ⛔ bukan string kosong di DB. */
export function keMuatan(f: FormPola, baru: boolean): Record<string, unknown> {
  const kosongJadiNull = (v: string): string | null => (v.trim().length === 0 ? null : v.trim())
  const muatan: Record<string, unknown> = {
    label:          f.label.trim(),
    deskripsi:      kosongJadiNull(f.deskripsi),
    jenis_ekspresi: f.jenis_ekspresi,
    ekspresi:       f.ekspresi,
    contoh:         kosongJadiNull(f.contoh),
    pesan_galat:    f.pesan_galat.trim(),
    effective_to:   kosongJadiNull(f.effective_to),
    sumber_nama:    kosongJadiNull(f.sumber_nama),
    sumber_url:     kosongJadiNull(f.sumber_url),
    sumber_tanggal: kosongJadiNull(f.sumber_tanggal),
  }
  if (baru) muatan.pola_key = f.pola_key.trim()
  if (f.effective_from.trim().length > 0) muatan.effective_from = f.effective_from.trim()
  return muatan
}
