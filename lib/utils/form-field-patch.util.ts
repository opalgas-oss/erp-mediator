// lib/utils/form-field-patch.util.ts
// Penjagaan muatan PATCH /api/form-fields/[form_key].
// Dibuat: Sesi #492 — SPEK_UI_SA_PANEL_KOLOM_URUTAN_DAN_SUNTING §4.
//
// Dipisahkan dari berkas rute supaya rutenya tetap tipis dan penjagaannya bisa diuji
// tanpa menyalakan server (plafon kode 10.240 B, ambang tindakan 8.192 B).
// Penjagaan atas isi `validasi` tinggal di berkas saudaranya `form-field-validasi.util.ts`.

import type { FormFieldPatch } from '@/lib/types/form-field-registry.types'
import { periksaValidasi } from '@/lib/utils/form-field-validasi.util'

/** Saklar boolean + urutan — yang sudah berjalan sejak S#483. */
const SAKLAR_BOOLEAN = ['is_visible', 'is_required', 'is_active', 'butuh_verifikasi_admin'] as const

export const LABEL_PANJANG_MIN = 1
export const LABEL_PANJANG_MAKS = 120

export type HasilPenjagaan =
  | { ok: true;  patches: FormFieldPatch[] }
  | { ok: false; pesan: string }

/**
 * Saring muatan PATCH. Field di luar tujuh kunci yang diizinkan DIBUANG, ⛔ tidak
 * diam-diam ditulis. Kesalahan bentuk memulangkan pesan yang MENYEBUT `id` barisnya —
 * supaya SA tahu baris mana yang salah, bukan sekadar "ada yang salah".
 */
export function saringPerubahan(
  perubahan:    unknown,
  polaKeyAktif: Set<string>,
): HasilPenjagaan {
  if (!Array.isArray(perubahan) || perubahan.length === 0) {
    return { ok: false, pesan: 'Body wajib memuat array "perubahan" yang tidak kosong' }
  }

  const patches: FormFieldPatch[] = []

  for (const item of perubahan as Record<string, unknown>[]) {
    if (typeof item?.id !== 'string' || item.id.length === 0) {
      return { ok: false, pesan: 'Setiap perubahan wajib punya "id" bertipe string' }
    }
    const patch: FormFieldPatch = { id: item.id }
    let adaIsi = false

    for (const kunci of SAKLAR_BOOLEAN) {
      if (item[kunci] === undefined) continue
      if (typeof item[kunci] !== 'boolean') {
        return { ok: false, pesan: `"${kunci}" pada ${item.id} harus boolean` }
      }
      patch[kunci] = item[kunci] as boolean
      adaIsi = true
    }

    if (item.urutan !== undefined) {
      if (!Number.isInteger(item.urutan)) {
        return { ok: false, pesan: `"urutan" pada ${item.id} harus bilangan bulat` }
      }
      patch.urutan = item.urutan as number
      adaIsi = true
    }

    if (item.label !== undefined) {
      if (typeof item.label !== 'string') {
        return { ok: false, pesan: `"label" pada ${item.id} harus teks` }
      }
      const label = item.label.trim()
      if (label.length < LABEL_PANJANG_MIN || label.length > LABEL_PANJANG_MAKS) {
        return {
          ok: false,
          pesan: `"label" pada ${item.id} harus ${LABEL_PANJANG_MIN}-${LABEL_PANJANG_MAKS} karakter`,
        }
      }
      patch.label = label
      adaIsi = true
    }

    if (item.validasi !== undefined) {
      const galat = periksaValidasi(item.id, item.validasi, polaKeyAktif)
      if (galat) return { ok: false, pesan: galat }
      patch.validasi = item.validasi as Record<string, unknown>
      adaIsi = true
    }

    if (adaIsi) patches.push(patch)
  }

  if (patches.length === 0) {
    return { ok: false, pesan: 'Nol perubahan yang bisa disimpan pada payload ini' }
  }
  return { ok: true, patches }
}
