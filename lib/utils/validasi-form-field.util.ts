// lib/utils/validasi-form-field.util.ts
// Validasi satu jawaban terhadap aturan `validasi` (JSON) di Field Registry.
// Dibuat: Sesi #486 — SPEK_FORMULIR_REGISTER_VENDOR_v1 §3 K6.
//
// 🔴 SATU SUMBER, DUA PEMAKAI. Berkas ini dipakai layar (pesan langsung) DAN server (penegakan).
//   ⛔ Karena itu ia TIDAK boleh 'server-only' dan TIDAK boleh menyentuh Supabase.
//   Kalau hanya layar yang memvalidasi, saklar `Wajib` yang SA nyalakan bisa dilewati begitu saja.

import type { FormFieldPublik } from '@/lib/types/form-field-registry.types'
import type { NilaiJawaban } from '@/lib/types/vendor-register.types'
import type { FormFieldPolaPublik, PolaTerpakai } from '@/lib/types/form-field-pola.types'
import { bangunEkspresi, polaBerlaku, tanggalHariIni, ujiPolaIsian } from '@/lib/utils/pola-isian.util'

/** Bentuk aturan yang dikenali Tahap 1. Kunci lain di JSON sengaja diabaikan, bukan ditolak. */
interface AturanValidasi {
  min_len?:           number
  max_len?:           number
  regex?:             string
  min_items?:         number
  max_items?:         number
  harus_true?:        boolean
  harus_sama_dengan?: string
  /** Pola BERLAPIS — K-488-T2. Berlapis adalah bentuk NORMAL; tunggal adalah kasus khusus. */
  pola?:              PolaTerpakai[]
}

function bacaAturan(row: FormFieldPublik): AturanValidasi {
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
export function validasiSatuKolom(
  row:         FormFieldPublik,
  nilai:       NilaiJawaban,
  katalogPola: FormFieldPolaPublik[] = [],
  tanggal:     string = tanggalHariIni(),
): string | null {
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
    // Pola berlapis (K-488-T2/T3) — dijalankan SESUDAH `regex` lama supaya kolom yang
    // masih memakai bentuk lama tidak berubah perilakunya.
    if (Array.isArray(aturan.pola) && aturan.pola.length > 0) {
      if (!ujiPolaIsian(teks, aturan.pola, katalogPola, tanggal)) {
        return pesanGalatPola(row, aturan.pola, katalogPola, tanggal)
      }
    }
  }

  return null
}

/**
 * Pesan galat untuk pola berlapis. Yang dipakai adalah pesan pola PERTAMA yang berlaku
 * pada tanggal itu — pendaftar tidak dibebani daftar semua bentuk yang pernah sah.
 * `{label}` dan nama parameter di dalam pesan diisi dari kolom dan dari pola itu sendiri.
 */
function pesanGalatPola(
  row:         FormFieldPublik,
  dipakai:     PolaTerpakai[],
  katalogPola: FormFieldPolaPublik[],
  tanggal:     string,
): string {
  for (const p of dipakai) {
    if (!polaBerlaku(p, tanggal)) continue
    for (const jenis of katalogPola) {
      if (jenis.pola_key !== p.nama) continue
      return bangunEkspresi(jenis.pesan_galat.replace(/\{label\}/g, row.label), p)
    }
  }
  return `Format ${row.label} tidak sesuai`
}

/**
 * Validasi seluruh jawaban terhadap daftar kolom yang benar-benar dirender.
 * `jawaban` yang field_key-nya tidak ada di `kolom` DIBUANG oleh pemanggil, bukan di sini.
 */
export function validasiSemuaKolom(
  kolom:       FormFieldPublik[],
  jawaban:     Record<string, NilaiJawaban>,
  katalogPola: FormFieldPolaPublik[] = [],
  tanggal:     string = tanggalHariIni(),
): Record<string, string> {
  const galat: Record<string, string> = {}
  for (const row of kolom) {
    const pesan = validasiSatuKolom(row, jawaban[row.field_key] ?? null, katalogPola, tanggal)
    if (pesan) galat[row.field_key] = pesan
  }
  return galat
}
