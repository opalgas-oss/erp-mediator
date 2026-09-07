// lib/utils/form-field-pola-patch.util.ts
// Penjagaan muatan tulis katalog JENIS pola isian (`form_field_pola`).
// Dibuat: Sesi #492 — K-488-T1b.
//
// 🔴 PENJAGA FORMAT, ⛔ BUKAN DAFTAR NILAI TERTUTUP. `pola_key` diuji dengan pola yang sama
//   dengan CHECK di Supabase (`^[a-z][a-z0-9_]*$`), meniru `chk_config_registry_feature_key_format`.
//   Daftar nilai tertutup akan membekukan katalog dan menuntut migrasi tiap jenis baru lahir —
//   persis yang ATURAN 8.2 butir 2 larang.

import type { FormFieldPolaTulis } from '@/lib/repositories/form-field-pola.repository'
import {
  LABEL_MAKS,
  PESAN_MAKS,
  POLA_KEY_POLA,
  ekspresiBisaDikompilasi,
  periksaParameterSkema,
  tanggalSah,
  teksIsi,
} from '@/lib/utils/form-field-pola-nilai.util'

export type HasilPenjagaanPola =
  | { ok: true;  isi: FormFieldPolaTulis }
  | { ok: false; pesan: string }

/**
 * Saring muatan tulis. `baru = true` saat baris LAHIR — hanya di situ `pola_key` boleh diisi;
 * mengubah kunci baris yang sudah dipakai kolom formulir akan memutus rujukannya diam-diam.
 */
export function saringPola(muatan: unknown, baru: boolean): HasilPenjagaanPola {
  if (muatan === null || typeof muatan !== 'object' || Array.isArray(muatan)) {
    return { ok: false, pesan: 'Body wajib berupa objek' }
  }
  const m = muatan as Record<string, unknown>
  const isi: FormFieldPolaTulis = {}

  if (baru) {
    if (typeof m.pola_key !== 'string' || !POLA_KEY_POLA.test(m.pola_key)) {
      return { ok: false, pesan: '"pola_key" harus diawali huruf kecil, lalu huruf kecil/angka/garis bawah' }
    }
    isi.pola_key = m.pola_key
  } else if (m.pola_key !== undefined) {
    return { ok: false, pesan: '"pola_key" tidak boleh diubah — ia kunci yang dirujuk kolom formulir' }
  }

  if (m.label !== undefined || baru) {
    if (!teksIsi(m.label, LABEL_MAKS)) return { ok: false, pesan: `"label" wajib 1-${LABEL_MAKS} karakter` }
    isi.label = (m.label as string).trim()
  }
  if (m.deskripsi !== undefined) {
    if (m.deskripsi !== null && typeof m.deskripsi !== 'string') return { ok: false, pesan: '"deskripsi" harus teks' }
    isi.deskripsi = m.deskripsi as string | null
  }
  if (m.jenis_ekspresi !== undefined || baru) {
    const j = m.jenis_ekspresi ?? 'regex'
    if (j !== 'regex' && j !== 'mask') return { ok: false, pesan: '"jenis_ekspresi" harus regex atau mask' }
    isi.jenis_ekspresi = j
  }
  if (m.ekspresi !== undefined || baru) {
    if (typeof m.ekspresi !== 'string' || m.ekspresi.trim().length === 0) {
      return { ok: false, pesan: '"ekspresi" wajib diisi' }
    }
    if (isi.jenis_ekspresi !== 'mask' && !ekspresiBisaDikompilasi(m.ekspresi)) {
      return { ok: false, pesan: 'Ekspresi tidak bisa dibaca sebagai pola. Periksa kurung dan tanda kurungnya.' }
    }
    isi.ekspresi = m.ekspresi.trim()
  }

  const galatParam = periksaParameterSkema(m.parameter_skema)
  if (galatParam) return { ok: false, pesan: galatParam }
  if (m.parameter_skema !== undefined) isi.parameter_skema = m.parameter_skema as Record<string, unknown>

  if (m.contoh !== undefined) isi.contoh = (m.contoh as string | null) ?? null
  if (m.pesan_galat !== undefined || baru) {
    if (!teksIsi(m.pesan_galat, PESAN_MAKS)) return { ok: false, pesan: `"pesan_galat" wajib 1-${PESAN_MAKS} karakter` }
    isi.pesan_galat = (m.pesan_galat as string).trim()
  }

  for (const kunci of ['effective_from', 'effective_to'] as const) {
    if (m[kunci] === undefined) continue
    if (m[kunci] === null) { isi[kunci] = null as never; continue }
    if (!tanggalSah(m[kunci])) return { ok: false, pesan: `"${kunci}" harus tanggal YYYY-MM-DD` }
    isi[kunci] = m[kunci] as string
  }
  if (isi.effective_from && isi.effective_to && isi.effective_to < isi.effective_from) {
    return { ok: false, pesan: '"effective_to" tidak boleh lebih awal dari "effective_from"' }
  }

  for (const kunci of ['sumber_nama', 'sumber_url'] as const) {
    if (m[kunci] === undefined) continue
    if (m[kunci] !== null && typeof m[kunci] !== 'string') return { ok: false, pesan: `"${kunci}" harus teks` }
    isi[kunci] = m[kunci] as string | null
  }
  if (m.sumber_tanggal !== undefined) {
    if (m.sumber_tanggal !== null && !tanggalSah(m.sumber_tanggal)) {
      return { ok: false, pesan: '"sumber_tanggal" harus tanggal YYYY-MM-DD' }
    }
    isi.sumber_tanggal = m.sumber_tanggal as string | null
  }
  if (m.is_active !== undefined) {
    if (typeof m.is_active !== 'boolean') return { ok: false, pesan: '"is_active" harus boolean' }
    isi.is_active = m.is_active
  }

  if (Object.keys(isi).length === 0) return { ok: false, pesan: 'Nol medan yang bisa disimpan pada payload ini' }
  return { ok: true, isi }
}
