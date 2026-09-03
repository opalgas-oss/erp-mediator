// lib/repositories/form-field-opsi.repository.ts
// Repository sumber opsi untuk kolom `select` / `multiselect` Field Registry.
// Dibuat: Sesi #486 — SPEK_FORMULIR_REGISTER_VENDOR_v1 §3 K1.
//
// Layer Repository (Route → Service → Repository). HANYA query DB di sini; pemetaan
// `sumber_opsi` → fungsi mana ada di form-field-opsi.service.ts.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { OpsiPilihan } from '@/lib/types/vendor-register.types'

// ─── categories ───────────────────────────────────────────────────────────────
/**
 * Kategori jasa yang boleh dipilih vendor = kategori DAUN (level 2) yang aktif.
 * Kategori induk (level 1) sengaja tidak ditawarkan: ia pengelompokan, bukan jasa yang dikerjakan.
 */
export async function FormFieldOpsiRepo_getKategoriJasa(): Promise<OpsiPilihan[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('categories')
    .select('id, display_name')
    .eq('level', 2)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`FormFieldOpsiRepo_getKategoriJasa: ${error.message}`)
  return (data ?? []).map((r) => ({
    nilai: String((r as { id: string }).id),
    label: String((r as { display_name: string }).display_name),
  }))
}

// ─── cities ───────────────────────────────────────────────────────────────────
/** Seluruh kota/kabupaten aktif. Daftarnya panjang ⇒ layar WAJIB menyediakan pencarian. */
export async function FormFieldOpsiRepo_getKota(): Promise<OpsiPilihan[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('cities')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(`FormFieldOpsiRepo_getKota: ${error.message}`)
  return (data ?? []).map((r) => ({
    nilai: String((r as { id: string }).id),
    label: String((r as { name: string }).name),
  }))
}

// ─── master dropdown ──────────────────────────────────────────────────────────
/**
 * Opsi dari satu grup Master Dropdown (`master_dropdown_groups.slug`).
 * Grup yang tidak ada memulangkan daftar KOSONG, bukan galat — kolomnya nanti dilewati
 * oleh service, supaya satu sumber yang belum terisi tidak merusak seluruh halaman.
 */
export async function FormFieldOpsiRepo_getGrupDropdown(slug: string): Promise<OpsiPilihan[]> {
  const db = createServerSupabaseClient()

  const { data: grup, error: galatGrup } = await db
    .from('master_dropdown_groups')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (galatGrup) throw new Error(`FormFieldOpsiRepo_getGrupDropdown(${slug}): ${galatGrup.message}`)
  if (!grup) return []

  const { data, error } = await db
    .from('master_dropdown_options')
    .select('slug, label')
    .eq('group_id', (grup as { id: string }).id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`FormFieldOpsiRepo_getGrupDropdown(${slug}): ${error.message}`)
  return (data ?? []).map((r) => ({
    nilai: String((r as { slug: string }).slug),
    label: String((r as { label: string }).label),
  }))
}
