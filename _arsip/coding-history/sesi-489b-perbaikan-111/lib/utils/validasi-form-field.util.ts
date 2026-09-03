// lib/utils/validasi-form-field.util.ts
// Validasi satu jawaban terhadap aturan `validasi` (JSON) di Field Registry.
// Dibuat: Sesi #486 — SPEK_FORMULIR_REGISTER_VENDOR_v1 §3 K6.
//
// 🔴 SATU SUMBER, DUA PEMAKAI. Berkas ini dipakai layar (pesan langsung) DAN server (penegakan).
//   ⛔ Karena itu ia TIDAK boleh 'server-only' dan TIDAK boleh menyentuh Supabase.
//   Kalau hanya layar yang memvalidasi, saklar `Wajib` yang SA nyalakan bisa dilewati begitu saja.

import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import type { NilaiJawaban } from '@/lib/types/vendor-register.types'

/** Bentuk aturan yang dikenali Tahap 1. Kunci lain di JSON sengaja diabaikan, bukan ditolak. */
interface AturanValidasi {
  min_len?:           number
  max_len?:           number
  regex?:             string
  min_items?:         number
  max_items?:         number
  harus_true?:        boolean
  harus_sama_dengan?: string
}

function bacaAturan(row: FormFieldRow): AturanValidasi {
  const v = row.validasi
  return (v && typeof v === 'object' ? v : {}) as AturanValidasi
}

function kosong(nilai: NilaiJawaban): boolean {
  if (nilai === null || nilai === undefined) return true
  if (typeof nilai === 'string')  return nilai.trim().length === 0
  if (Array.isArray(nilai))       return nilai.length === 0
  if (typeof nilai === 'boolean') return nilai === false
  return false
}

/**
 * Memulangkan pesan galat, atau `null` kalau lolos.
 * ⛔ Kolom yang tidak `is_visible`/`is_active` TIDAK divalidasi di sini — penyaringnya di pemanggil,
 *   supaya kolom yang SA matikan benar-benar berhenti berakibat (K-483-4).
 */
export function validasiSatuKolom(row: FormFieldRow, nilai: NilaiJawaban): string | null {
  const aturan = bacaAturan(row)

  if (kosong(nilai)) {
    if (row.is_required) {
      return row.tipe_input === 'boolean'
        ? `${row.label} wajib dicentang`
        : `${row.label} wajib diisi`
    }
    return null
  }

  if (row.tipe_input === 'boolean') {
    if (aturan.harus_true === true && nilai !== true) return `${row.label} wajib dicentang`
    return null
  }

  if (Array.isArray(nilai)) {
    if (aturan.min_items !== undefined && nilai.length < aturan.min_items) {
      return `Pilih minimal ${aturan.min_items} pada ${row.label}`
    }
    if (aturan.max_items !== undefined && nilai.length > aturan.max_items) {
      return `Maksimal ${aturan.max_items} pilihan pada ${row.label}`
    }
    return null
  }

  if (typeof nilai === 'string') {
    const teks = nilai.trim()
    if (aturan.min_len !== undefined && teks.length < aturan.min_len) {
      return `${row.label} minimal ${aturan.min_len} karakter`
    }
    if (aturan.max_len !== undefined && teks.length > aturan.max_len) {
      return `${row.label} maksimal ${aturan.max_len} karakter`
    }
    if (aturan.regex !== undefined && aturan.regex.length > 0) {
      let cocok = true
      try {
        cocok = new RegExp(aturan.regex).test(teks)
      } catch {
        // Pola rusak = kesalahan data, bukan kesalahan pendaftar ⇒ jangan menghalangi kiriman.
        cocok = true
      }
      if (!cocok) return `Format ${row.label} tidak sesuai`
    }
  }

  return null
}

/**
 * Validasi seluruh jawaban terhadap daftar kolom yang benar-benar dirender.
 * `jawaban` yang field_key-nya tidak ada di `kolom` DIBUANG oleh pemanggil, bukan di sini.
 */
export function validasiSemuaKolom(
  kolom:   FormFieldRow[],
  jawaban: Record<string, NilaiJawaban>,
): Record<string, string> {
  const galat: Record<string, string> = {}
  for (const row of kolom) {
    const pesan = validasiSatuKolom(row, jawaban[row.field_key] ?? null)
    if (pesan) galat[row.field_key] = pesan
  }
  return galat
}
