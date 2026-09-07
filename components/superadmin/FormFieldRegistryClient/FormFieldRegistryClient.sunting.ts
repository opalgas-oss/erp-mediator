// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.sunting.ts
// Terjemahan dua arah antara objek `validasi` (jsonb) dan keadaan dialog Sunting.
// Dibuat: Sesi #493 — butir 1b, SPEK §4 + K-488-T2/T4/T5. Fungsi murni, nol React.
//
// 🔴 KUNCI YANG TIDAK DIRENDER DIALOG DIBAWA UTUH DI `lain`, ⛔ BUKAN DIBUANG.
//   Kolom bertipe berkas menyimpan `maks_mb` · `tipe` · `kamera_langsung`; dialog belum
//   menawarkannya (belum ada penegaknya, K-492-T8). Kalau kunci itu hilang hanya karena
//   SA menyunting label, dialog menghapus data diam-diam — kelas kesalahan yang lebih
//   berbahaya daripada pengaturan yang belum ada.

import type { FormFieldPolaPublik, PolaTerpakai } from '@/lib/types/form-field-pola.types'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import type { DraftSunting, PolaBaris } from './FormFieldRegistryClient.kontrak'
import { KUNCI_DIRENDER } from './FormFieldRegistryClient.kontrak'

const teks = (n: unknown): string => (typeof n === 'string' ? n : n === undefined || n === null ? '' : String(n))

function bacaPola(v: Record<string, unknown>): PolaBaris[] {
  if (!Array.isArray(v.pola)) return []
  return (v.pola as PolaTerpakai[]).filter(p => p && typeof p === 'object').map(p => {
    const parameter: Record<string, string> = {}
    for (const [k, isi] of Object.entries(p)) {
      if (k === 'nama' || k === 'berlaku_sejak' || k === 'berlaku_sampai' || k === 'sumber') continue
      parameter[k] = teks(isi)
    }
    return {
      nama:           teks(p.nama),
      parameter,
      berlaku_sejak:  teks(p.berlaku_sejak),
      berlaku_sampai: teks(p.berlaku_sampai),
      sumber:         teks(p.sumber),
    }
  })
}

/** Keadaan awal dialog untuk satu baris — dibaca dari baris yang SEDANG di layar. */
export function bacaDraft(field: FormFieldRow): DraftSunting {
  const v = (field.validasi ?? {}) as Record<string, unknown>
  const lain: Record<string, unknown> = {}
  for (const [k, isi] of Object.entries(v)) if (!KUNCI_DIRENDER.has(k)) lain[k] = isi

  return {
    id:              field.id,
    label:           field.label,
    pola:            bacaPola(v),
    min_len:         teks(v.min_len),
    max_len:         teks(v.max_len),
    min_items:       teks(v.min_items),
    max_items:       teks(v.max_items),
    tampilan:        v.tampilan === 'disamarkan' ? 'disamarkan' : 'apa_adanya',
    harus_sama_dengan: teks(v.harus_sama_dengan),
    harus_true:      v.harus_true === true,
    lain,
  }
}

/** Angka yang benar-benar diisi. Kosong ⇒ kunci itu TIDAK ditulis, bukan ditulis 0. */
function angka(nilai: string): number | null {
  const t = nilai.trim()
  if (t.length === 0) return null
  const n = Number(t)
  return Number.isInteger(n) && n >= 0 ? n : null
}

function susunPola(daftar: PolaBaris[], katalog: FormFieldPolaPublik[]): PolaTerpakai[] {
  const hasil: PolaTerpakai[] = []
  for (const p of daftar) {
    if (p.nama.trim().length === 0) continue
    const butir: PolaTerpakai = { nama: p.nama }
    const skema = katalog.find(k => k.pola_key === p.nama)?.parameter_skema ?? {}
    for (const [nama, isi] of Object.entries(p.parameter)) {
      if (isi.trim().length === 0) continue
      butir[nama] = skema[nama]?.jenis === 'bilangan' ? Number(isi) : isi
    }
    if (p.berlaku_sejak.trim())  butir.berlaku_sejak  = p.berlaku_sejak.trim()
    butir.berlaku_sampai = p.berlaku_sampai.trim() || null
    if (p.sumber.trim())         butir.sumber         = p.sumber.trim()
    hasil.push(butir)
  }
  return hasil
}

/**
 * Susun kembali objek `validasi` UTUH — SPEK §4 mewajibkan gabungan, ⛔ bukan tambalan sebagian.
 * Medan yang dikosongkan SA berarti kuncinya hilang; itu satu-satunya cara mencabut aturan.
 */
export function susunValidasi(
  draft:   DraftSunting,
  katalog: FormFieldPolaPublik[],
): Record<string, unknown> {
  const v: Record<string, unknown> = { ...draft.lain }

  const pola = susunPola(draft.pola, katalog)
  if (pola.length > 0) v.pola = pola

  for (const [kunci, nilai] of [
    ['min_len', draft.min_len], ['max_len', draft.max_len],
    ['min_items', draft.min_items], ['max_items', draft.max_items],
  ] as const) {
    const n = angka(nilai)
    if (n !== null) v[kunci] = n
  }

  // `apa_adanya` adalah keadaan bawaan pembacanya (`bacaTampilan`), jadi ia tidak ditulis —
  // menulisnya hanya menambah kunci pada setiap baris yang pernah disentuh SA.
  if (draft.tampilan === 'disamarkan') v.tampilan = 'disamarkan'
  if (draft.harus_sama_dengan.trim()) v.harus_sama_dengan = draft.harus_sama_dengan.trim()
  if (draft.harus_true) v.harus_true = true

  return v
}
