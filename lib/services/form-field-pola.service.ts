// lib/services/form-field-pola.service.ts
// Service katalog JENIS pola isian. Dibuat: Sesi #492 — K-488-T1b.
//
// Layer Service (3-layer: Route -> Service -> Repository). Nol query DB langsung di sini.
//
// ⛔ TIDAK di-cache, dan sebabnya sama dengan yang S#486 ukur pada susunan kolom (#109):
//   katalog ini menentukan SAH atau TIDAKNYA isian pendaftar. Satu query ringan per
//   pembukaan halaman jauh lebih murah daripada formulir yang menolak isian memakai
//   katalog yang sudah tidak berlaku.

import 'server-only'
import {
  FormFieldPolaRepo_getAll,
  FormFieldPolaRepo_getAktif,
} from '@/lib/repositories/form-field-pola.repository'
import type { FormFieldPolaPublik, FormFieldPolaRow } from '@/lib/types/form-field-pola.types'

/**
 * Ramping satu baris jadi bentuk yang boleh menyeberang ke komponen klien — pola #111.
 * ⛔ Menambah medan di sini WAJIB disertai pembacanya (ATURAN 34).
 * Enam medan di bawah adalah yang benar-benar dibaca: dialog sunting (label · parameter),
 * dan validator (ekspresi · jenis_ekspresi · pesan_galat · pola_key).
 */
export function kePolaPublik(row: FormFieldPolaRow): FormFieldPolaPublik {
  return {
    pola_key:        row.pola_key,
    label:           row.label,
    jenis_ekspresi:  row.jenis_ekspresi,
    ekspresi:        row.ekspresi,
    parameter_skema: row.parameter_skema,
    pesan_galat:     row.pesan_galat,
  }
}

/** Katalog AKTIF, sudah ramping — dipakai formulir pendaftaran dan dialog sunting SA. */
export async function getKatalogPolaPublik(): Promise<FormFieldPolaPublik[]> {
  const rows = await FormFieldPolaRepo_getAktif()
  return rows.map(kePolaPublik)
}

/** SELURUH jenis pola untuk layar SA — termasuk yang dimatikan (PRINSIP MULTI-TENANT butir 13). */
export async function getKatalogPolaUntukAdmin(): Promise<FormFieldPolaRow[]> {
  return FormFieldPolaRepo_getAll()
}

/**
 * Himpunan `pola_key` yang sah dipakai hari ini. Dipakai rute PATCH sebagai penjagaan:
 * `nama` pola yang tidak dikenal ditolak 400, ⛔ bukan disimpan diam-diam
 * (SPEK §4 penjagaan butir 2).
 */
export async function getPolaKeyAktif(): Promise<Set<string>> {
  const rows = await FormFieldPolaRepo_getAktif()
  return new Set(rows.map((r) => r.pola_key))
}
