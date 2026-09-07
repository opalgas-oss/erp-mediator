// lib/repositories/form-field-registry.repository.ts
// Repository Field Registry (tabel form_field_registry).
// Dibuat: Sesi #483 — K-483-4.
//
// Layer Repository (3-layer: Route → Service → Repository). HANYA query DB di sini.
// Pengelompokan + caching ada di Service (form-field-registry.service.ts).

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { FormFieldRow, FormFieldSaklarPatch } from '@/lib/types/form-field-registry.types'

const KOLOM_TERPILIH =
  'id, form_key, field_key, group_key, label, deskripsi, placeholder, tipe_input, sumber_opsi, ' +
  'urutan, is_visible, is_required, is_active, butuh_verifikasi_admin, validasi, ' +
  'dasar_hukum, catatan_risiko, is_system'

// ─── Semua kolom satu formulir — untuk layar SuperAdmin ───────────────────────
/**
 * Ambil SELURUH baris satu formulir, termasuk yang `is_visible=false` dan `is_active=false`.
 * SA harus melihat kolom yang sedang dimatikan — kalau tidak, ia tidak bisa menyalakannya lagi.
 * Pola sama dengan `getConfigPageItems` yang juga tidak menyaring `is_active` (S#110).
 * Yang tetap disaring: baris yang sudah di-soft-delete.
 */
export async function FormFieldRegistryRepo_getAllByFormKey(
  formKey: string
): Promise<FormFieldRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('form_field_registry')
    .select(KOLOM_TERPILIH)
    .eq('form_key', formKey)
    .is('deleted_at', null)
    .order('urutan', { ascending: true })

  if (error) throw new Error(`FormFieldRegistryRepo_getAllByFormKey(${formKey}): ${error.message}`)
  return (data ?? []) as unknown as FormFieldRow[]
}

// ─── Kolom yang benar-benar dirender ke pemakai ───────────────────────────────
/**
 * Ambil kolom yang tampil DAN aktif — inilah yang dipakai formulir `/register`.
 * ⚠️ Sengaja fungsi TERPISAH dari yang di atas: layar SA dan formulir pemakai punya
 * kebutuhan berbeda, dan menyatukannya lewat parameter boolean membuat pemanggil mudah
 * keliru menampilkan kolom yang sedang dimatikan kepada vendor.
 */
export async function FormFieldRegistryRepo_getAktifByFormKey(
  formKey: string
): Promise<FormFieldRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('form_field_registry')
    .select(KOLOM_TERPILIH)
    .eq('form_key', formKey)
    .eq('is_visible', true)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('urutan', { ascending: true })

  if (error) throw new Error(`FormFieldRegistryRepo_getAktifByFormKey(${formKey}): ${error.message}`)
  return (data ?? []) as unknown as FormFieldRow[]
}

// ─── Ubah saklar satu baris ───────────────────────────────────────────────────
/**
 * Ubah satu baris. Hanya field yang benar-benar dikirim yang ikut ditulis —
 * `undefined` TIDAK menimpa nilai yang ada.
 * `formKey` ikut jadi syarat WHERE supaya satu formulir tidak bisa menyunting baris formulir lain.
 */
export async function FormFieldRegistryRepo_updateSaklar(
  formKey: string,
  patch:   FormFieldSaklarPatch,
  uid:     string,
): Promise<void> {
  const perubahan: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: uid,
  }
  if (patch.is_visible             !== undefined) perubahan.is_visible             = patch.is_visible
  if (patch.is_required            !== undefined) perubahan.is_required            = patch.is_required
  if (patch.is_active              !== undefined) perubahan.is_active              = patch.is_active
  if (patch.butuh_verifikasi_admin !== undefined) perubahan.butuh_verifikasi_admin = patch.butuh_verifikasi_admin
  if (patch.urutan                 !== undefined) perubahan.urutan                 = patch.urutan

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('form_field_registry')
    .update(perubahan)
    .eq('id', patch.id)
    .eq('form_key', formKey)
    .is('deleted_at', null)

  if (error) throw new Error(`FormFieldRegistryRepo_updateSaklar(${formKey}/${patch.id}): ${error.message}`)
}
