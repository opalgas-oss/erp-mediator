// lib/services/form-field-registry.service.ts
// Service Field Registry — pengelompokan + aturan baca untuk layar SA dan formulir pemakai.
// Dibuat: Sesi #483 — K-483-4.
//
// Layer Service (3-layer: Route → Service → Repository). Nol query DB langsung di sini.

import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import {
  FormFieldRegistryRepo_getAllByFormKey,
  FormFieldRegistryRepo_getAktifByFormKey,
} from '@/lib/repositories/form-field-registry.repository'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'

/** Nama tag cache — pembaca dan penulis DILARANG punya salinan string masing-masing (ATURAN 36). */
export const TAG_FORM_FIELDS = 'form-fields'
export const tagFormFields = (formKey: string): string => `${TAG_FORM_FIELDS}:${formKey}`

/** Satu kelompok kolom, siap dirender jadi satu bagian di layar. */
export interface FormFieldGroup {
  group_key: string
  fields:    FormFieldRow[]
}

// ─── Untuk layar SuperAdmin ───────────────────────────────────────────────────
/**
 * SELURUH kolom formulir, termasuk yang sedang dimatikan, dikelompokkan per `group_key`
 * dengan urutan kelompok mengikuti `urutan` terkecil di dalamnya.
 * ⛔ TIDAK di-cache: SA baru saja mengubah saklar dan harus melihat hasilnya seketika.
 */
export async function getFormFieldsUntukAdmin(formKey: string): Promise<FormFieldGroup[]> {
  const rows = await FormFieldRegistryRepo_getAllByFormKey(formKey)
  return kelompokkan(rows)
}

// ─── Untuk formulir yang dilihat pemakai ──────────────────────────────────────
/**
 * Hanya kolom yang tampil DAN aktif. Di-cache karena dibaca setiap kali halaman
 * pendaftaran dibuka, dan berubah hanya saat SA menggeser saklar.
 * Cache dihapus lewat `invalidateFormFieldsCache()` di rute PATCH — momen yang sama
 * dengan penulisannya, supaya layar tidak pernah menampilkan susunan kolom yang basi.
 */
export async function getFormFieldsUntukFormulir(formKey: string): Promise<FormFieldGroup[]> {
  const baca = unstable_cache(
    async () => kelompokkan(await FormFieldRegistryRepo_getAktifByFormKey(formKey)),
    ['form-fields', formKey],
    { revalidate: 300, tags: [TAG_FORM_FIELDS, tagFormFields(formKey)] },
  )
  return baca()
}

/** Hapus cache susunan kolom satu formulir. WAJIB dipanggil sesudah SA menyimpan perubahan. */
export function invalidateFormFieldsCache(formKey: string): void {
  revalidateTag(tagFormFields(formKey), 'default')
  revalidateTag(TAG_FORM_FIELDS, 'default')
}

// ─── Helper ───────────────────────────────────────────────────────────────────
/**
 * Kelompokkan per `group_key`. Urutan kelompok = urutan kemunculan pertama pada baris
 * yang SUDAH terurut `urutan` dari repository ⇒ mengubah `urutan` sebuah kolom juga
 * memindahkan kelompoknya, tanpa perlu kolom urutan kedua.
 */
function kelompokkan(rows: FormFieldRow[]): FormFieldGroup[] {
  const peta = new Map<string, FormFieldRow[]>()
  for (const row of rows) {
    if (!peta.has(row.group_key)) peta.set(row.group_key, [])
    peta.get(row.group_key)!.push(row)
  }
  return Array.from(peta.entries()).map(([group_key, fields]) => ({ group_key, fields }))
}
