// lib/repositories/form-field-pola.repository.ts
// Repository katalog JENIS pola isian (tabel form_field_pola).
// Dibuat: Sesi #492 — K-488-T1b.
//
// Layer Repository (3-layer: Route -> Service -> Repository). HANYA query DB di sini.

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { FormFieldPolaRow } from '@/lib/types/form-field-pola.types'

const KOLOM_TERPILIH =
  'id, pola_key, label, deskripsi, jenis_ekspresi, ekspresi, parameter_skema, contoh, ' +
  'pesan_galat, effective_from, effective_to, sumber_nama, sumber_url, sumber_tanggal, ' +
  'is_system, is_active'

/** Medan yang boleh ditulis SA. `pola_key` hanya boleh diisi saat baris LAHIR. */
export interface FormFieldPolaTulis {
  pola_key?:        string
  label?:           string
  deskripsi?:       string | null
  jenis_ekspresi?:  string
  ekspresi?:        string
  parameter_skema?: Record<string, unknown>
  contoh?:          string | null
  pesan_galat?:     string
  effective_from?:  string
  effective_to?:    string | null
  sumber_nama?:     string | null
  sumber_url?:      string | null
  sumber_tanggal?:  string | null
  is_active?:       boolean
}

/**
 * SELURUH jenis pola, termasuk yang `is_active = false`.
 * PRINSIP DESAIN MULTI-TENANT butir 13: SA SELALU melihat semua item — kalau tidak,
 * ia tidak bisa menyalakan lagi yang pernah dimatikannya.
 */
export async function FormFieldPolaRepo_getAll(): Promise<FormFieldPolaRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('form_field_pola')
    .select(KOLOM_TERPILIH)
    .is('deleted_at', null)
    .order('label', { ascending: true })

  if (error) throw new Error(`FormFieldPolaRepo_getAll: ${error.message}`)
  return (data ?? []) as unknown as FormFieldPolaRow[]
}

/**
 * Jenis pola yang AKTIF — inilah yang dipakai validator dan dialog sunting.
 * ⚠️ Sengaja fungsi TERPISAH: menyatukannya lewat parameter boolean membuat pemanggil
 * mudah keliru menawarkan jenis yang sedang dimatikan kepada pendaftar.
 */
export async function FormFieldPolaRepo_getAktif(): Promise<FormFieldPolaRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('form_field_pola')
    .select(KOLOM_TERPILIH)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('label', { ascending: true })

  if (error) throw new Error(`FormFieldPolaRepo_getAktif: ${error.message}`)
  return (data ?? []) as unknown as FormFieldPolaRow[]
}

/** Baris baru. `pola_key` diuji FORMAT oleh CHECK di Supabase, bukan oleh daftar nilai. */
export async function FormFieldPolaRepo_buat(
  isi: FormFieldPolaTulis,
  uid: string,
): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('form_field_pola')
    .insert({ ...isi, created_by: uid, updated_by: uid })
    .select('id')
    .single()

  if (error) throw new Error(`FormFieldPolaRepo_buat(${isi.pola_key}): ${error.message}`)
  return (data as { id: string }).id
}

/** Ubah satu baris. Hanya medan yang benar-benar dikirim yang ikut ditulis. */
export async function FormFieldPolaRepo_ubah(
  id:  string,
  isi: FormFieldPolaTulis,
  uid: string,
): Promise<void> {
  const perubahan: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: uid }
  for (const [kunci, nilai] of Object.entries(isi)) {
    if (nilai !== undefined) perubahan[kunci] = nilai
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('form_field_pola')
    .update(perubahan)
    .eq('id', id)
    .is('deleted_at', null)

  if (error) throw new Error(`FormFieldPolaRepo_ubah(${id}): ${error.message}`)
}

/**
 * Soft delete. ⛔ Baris `is_system = true` DILARANG dihapus — ia jenis pola bawaan yang
 * mungkin sedang dipakai kolom formulir; yang benar adalah MEMATIKANNYA (`is_active`).
 */
export async function FormFieldPolaRepo_hapus(id: string, uid: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('form_field_pola')
    .update({ deleted_at: new Date().toISOString(), deleted_by: uid })
    .eq('id', id)
    .eq('is_system', false)
    .is('deleted_at', null)

  if (error) throw new Error(`FormFieldPolaRepo_hapus(${id}): ${error.message}`)
}
