// lib/services/vendor-register.susunan.ts
// Susunan kolom formulir pendaftaran vendor — apa yang benar-benar dirender.
// Lahir: Sesi #492, dari pemecahan `lib/services/vendor-register.service.ts`.
//
// 🔴 SEBAB PEMECAHANNYA DIUKUR, BUKAN DIRASA (ATURAN 53.1 + 50.2): induk terukur
//   8.564 B = 83,63% plafon kode 10.240 B — SUDAH di atas ambang tindakan 8.192 B
//   sebelum sesi ini menyentuhnya (hutang #120). ⇒ dipecah LEBIH DULU, sebagai commit
//   tersendiri, NOL perubahan perilaku — persis pola pemecahan S#489.
//   Isi di bawah DIPINDAH oleh program dari berkas asal — nol karakter diketik ulang,
//   nol kalimat diringkas, urutan asli dipertahankan.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-492-pecah-vendor-register-service/
// ISI BERKAS INI: konstanta + SusunanFormulir + getSusunanFormulirVendor + kelompokkanKolom.
//
// Sumbu pemecahan = ALASAN BERUBAH: apa yang DIRENDER di sini · apa yang DIREKAM di
//   `.rekaman.ts` · alur pendaftaran di induk.

import 'server-only'
import { getFormFieldsUntukFormulir } from '@/lib/services/form-field-registry.service'
import { getOpsiUntukKolom, saringKolomYangBisaDirender } from '@/lib/services/form-field-opsi.service'
import { keKolomPublik } from '@/lib/services/form-field-registry.service'
import type { FormFieldRow, FormFieldPublik } from '@/lib/types/form-field-registry.types'
import type { OpsiPilihan } from '@/lib/types/vendor-register.types'

export const FORM_KEY_VENDOR = 'register_vendor'
export const FEATURE_KEY_VENDOR = 'register_vendor'

/**
 * Tipe kolom yang Tahap 1 sanggup render. `file` dan `image` sengaja BELUM didukung —
 * belum ada tempat penyimpanan berkas (SPEK §1). Kalau SA menyalakannya, kolomnya dilewati
 * dengan catatan log, ⛔ bukan membuat formulir buntu.
 */
const TIPE_DIDUKUNG_TAHAP_1 = ['text', 'textarea', 'number', 'boolean', 'select', 'multiselect', 'date']

export interface SusunanFormulir {
  kolom: FormFieldRow[]
  opsi:  Record<string, OpsiPilihan[]>
}

/**
 * Susunan kolom yang benar-benar berlaku: aktif + tampil (dari Field Registry), tipenya didukung,
 * dan — untuk kolom pilihan — sumber opsinya benar-benar berisi.
 * ⇒ Layar dan server memakai fungsi yang SAMA, jadi keduanya tidak mungkin berbeda pendapat.
 */
export async function getSusunanFormulirVendor(): Promise<SusunanFormulir> {
  const grup   = await getFormFieldsUntukFormulir(FORM_KEY_VENDOR)
  const semua  = grup.flatMap((g) => g.fields)

  const didukung = semua.filter((k) => {
    if (TIPE_DIDUKUNG_TAHAP_1.includes(k.tipe_input)) return true
    console.warn(`[vendor-register] tipe "${k.tipe_input}" belum didukung ⇒ kolom "${k.field_key}" dilewati`)
    return false
  })

  const opsi  = await getOpsiUntukKolom(didukung)
  const kolom = saringKolomYangBisaDirender(didukung, opsi)
  return { kolom, opsi }
}

/** Kelompokkan untuk layar, urutan kelompok mengikuti kemunculan pertama (urutan sudah terurut). */
export function kelompokkanKolom(kolom: FormFieldRow[]): { group_key: string; fields: FormFieldPublik[] }[] {
  // #111 (S#489): dirampingkan DI SINI, sebelum menyeberang ke komponen klien.
  const peta = new Map<string, FormFieldPublik[]>()
  for (const k of kolom) {
    if (!peta.has(k.group_key)) peta.set(k.group_key, [])
    peta.get(k.group_key)!.push(keKolomPublik(k))
  }
  return Array.from(peta.entries()).map(([group_key, fields]) => ({ group_key, fields }))
}
