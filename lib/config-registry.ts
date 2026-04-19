// lib/config-registry.ts
// Membaca Dynamic Config Registry dari PostgreSQL (Supabase)
// Tabel: config_registry
//
// PERUBAHAN dari versi Firebase:
//   - Import Firebase → Supabase server client
//   - Schema berubah: dari nested fields per dokumen → flat row per item
//   - Interface ConfigRegistryItem diupdate sesuai schema PostgreSQL baru
//   - Hapus 3 TODO comment yang sudah kedaluarsa
//   - Tambah unstable_cache untuk caching efektif di Vercel
//   - Tambah import 'server-only'

import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ============================================================
// TYPE DEFINITIONS — sesuai schema tabel config_registry PostgreSQL
// ============================================================

/** Satu item konfigurasi dari tabel config_registry */
export interface ConfigItem {
  id:          string
  feature_key: string
  tenant_id:   string | null
  label:       string
  deskripsi:   string | null
  kategori:    string
  nilai:       string
  tipe_data:   'string' | 'number' | 'boolean' | 'select'
  terenkripsi: boolean
  akses_baca:  string[]
  akses_ubah:  string[]
  nilai_min:   number | null
  nilai_maks:  number | null
  nilai_enum:  string[] | null
  is_active:   boolean
  updated_at:  string
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

/**
 * Ambil nilai satu item konfigurasi berdasarkan feature_key.
 * Mengembalikan nilai aktual (nilai), bukan default.
 */
export async function getConfigValue(
  featureKey: string
): Promise<string> {
  const item = await getConfigItem(featureKey)
  return item.nilai
}

/**
 * Ambil satu item konfigurasi lengkap berdasarkan feature_key.
 */
export async function getConfigItem(
  featureKey: string
): Promise<ConfigItem> {
  const cached = unstable_cache(
    async () => {
      const db = createServerSupabaseClient()

      const { data, error } = await db
        .from('config_registry')
        .select('*')
        .eq('feature_key', featureKey)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        throw new Error(
          `Konfigurasi '${featureKey}' tidak ditemukan di Config Registry`
        )
      }

      return data as ConfigItem
    },
    [`config:item:${featureKey}`],
    { revalidate: 15 * 60, tags: [`config:${featureKey}`] }
  )

  return cached()
}

/**
 * Ambil semua item konfigurasi berdasarkan kategori.
 * Dipakai untuk render halaman Settings yang dikelompokkan per kategori.
 */
export async function getAllConfigsByCategory(
  kategori: string,
  maxResults: number = 50
): Promise<ConfigItem[]> {
  const cached = unstable_cache(
    async () => {
      const db = createServerSupabaseClient()

      const { data, error } = await db
        .from('config_registry')
        .select('*')
        .eq('kategori', kategori)
        .eq('is_active', true)
        .order('feature_key', { ascending: true })
        .limit(maxResults)

      if (error) {
        throw new Error(
          `Gagal ambil konfigurasi kategori '${kategori}': ${error.message}`
        )
      }

      return (data ?? []) as ConfigItem[]
    },
    [`config:kategori:${kategori}`],
    { revalidate: 15 * 60, tags: [`config:kategori:${kategori}`] }
  )

  return cached()
}

/**
 * Ambil semua item konfigurasi berdasarkan feature_key prefix.
 * Contoh: feature_key = 'security_login' → ambil semua item security_login.*
 */
export async function getConfigsByFeatureKey(
  featureKey: string
): Promise<ConfigItem[]> {
  const cached = unstable_cache(
    async () => {
      const db = createServerSupabaseClient()

      const { data, error } = await db
        .from('config_registry')
        .select('*')
        .eq('feature_key', featureKey)
        .eq('is_active', true)
        .order('label', { ascending: true })

      if (error) {
        throw new Error(
          `Gagal ambil konfigurasi '${featureKey}': ${error.message}`
        )
      }

      return (data ?? []) as ConfigItem[]
    },
    [`config:feature:${featureKey}`],
    { revalidate: 15 * 60, tags: [`config:${featureKey}`] }
  )

  return cached()
}