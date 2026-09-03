// lib/services/form-field-opsi.service.ts
// Penerjemah `sumber_opsi` → daftar opsi. Dibuat: Sesi #486 (SPEK §3 K1).
//
// 🔴 SATU PETA ALAMAT, DI SINI SAJA. Menaruh cabang `if (sumber === 'cities')` di komponen berarti
//   setiap sumber baru menyentuh UI lagi — dan `sumber_opsi` adalah DATA yang SA boleh ubah.
//
// Sumber yang TIDAK dikenali, atau yang dikenali tetapi kosong, memulangkan daftar kosong.
// Kolomnya kemudian DILEWATI oleh pemanggil (bukan merusak halaman) dan dicatat ke log —
// inilah yang mencegah "dropdown kosong yang wajib diisi" seperti kasus `kbli` di S#486.

import 'server-only'
import { unstable_cache } from 'next/cache'
import {
  FormFieldOpsiRepo_getKategoriJasa,
  FormFieldOpsiRepo_getKota,
  FormFieldOpsiRepo_getGrupDropdown,
} from '@/lib/repositories/form-field-opsi.repository'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import type { OpsiPilihan } from '@/lib/types/vendor-register.types'

/** Alamat yang punya tabel sendiri. Selain ini dianggap slug grup Master Dropdown. */
const SUMBER_BERTABEL: Record<string, () => Promise<OpsiPilihan[]>> = {
  categories: FormFieldOpsiRepo_getKategoriJasa,
  cities:     FormFieldOpsiRepo_getKota,
}

export const TAG_FORM_OPSI = 'form-opsi'

/** Daftar opsi satu sumber. Di-cache: isinya berubah jarang, dibaca tiap halaman dibuka. */
export async function getOpsiUntukSumber(sumber: string): Promise<OpsiPilihan[]> {
  const kunci = sumber.trim()
  if (kunci.length === 0) return []

  const baca = unstable_cache(
    async (): Promise<OpsiPilihan[]> => {
      const bertabel = SUMBER_BERTABEL[kunci]
      if (bertabel) return bertabel()
      return FormFieldOpsiRepo_getGrupDropdown(kunci)
    },
    ['form-opsi', kunci],
    { revalidate: 300, tags: [TAG_FORM_OPSI, `${TAG_FORM_OPSI}:${kunci}`] },
  )

  return baca()
}

/**
 * Ambil opsi untuk SELURUH kolom yang membutuhkannya, sekali jalan.
 * Memulangkan peta `field_key` → opsi. Kolom yang sumbernya kosong TIDAK masuk peta,
 * sehingga pemanggil bisa melewatinya dengan satu pemeriksaan.
 */
export async function getOpsiUntukKolom(
  kolom: FormFieldRow[],
): Promise<Record<string, OpsiPilihan[]>> {
  const butuh = kolom.filter(
    (k) => (k.tipe_input === 'select' || k.tipe_input === 'multiselect') && !!k.sumber_opsi,
  )
  if (butuh.length === 0) return {}

  const sumberUnik = Array.from(new Set(butuh.map((k) => k.sumber_opsi as string)))
  const hasil = await Promise.all(sumberUnik.map((s) => getOpsiUntukSumber(s)))

  const perSumber: Record<string, OpsiPilihan[]> = {}
  sumberUnik.forEach((s, i) => { perSumber[s] = hasil[i] ?? [] })

  const peta: Record<string, OpsiPilihan[]> = {}
  for (const k of butuh) {
    const opsi = perSumber[k.sumber_opsi as string] ?? []
    if (opsi.length === 0) {
      console.warn(
        `[form-field-opsi] sumber "${k.sumber_opsi}" nol opsi ⇒ kolom "${k.field_key}" dilewati`,
      )
      continue
    }
    peta[k.field_key] = opsi
  }
  return peta
}

/**
 * Kolom yang benar-benar bisa dirender: kolom pilihan tanpa opsi DIBUANG.
 * Dipakai layar DAN server, supaya keduanya sepakat kolom mana yang berlaku.
 */
export function saringKolomYangBisaDirender(
  kolom: FormFieldRow[],
  peta:  Record<string, OpsiPilihan[]>,
): FormFieldRow[] {
  return kolom.filter((k) => {
    const butuhOpsi = k.tipe_input === 'select' || k.tipe_input === 'multiselect'
    if (!butuhOpsi) return true
    return (peta[k.field_key]?.length ?? 0) > 0
  })
}
