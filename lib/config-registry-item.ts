// lib/config-registry-item.ts
// Pembaca BARIS PENUH `config_registry` untuk layar pengaturan SuperAdmin.
// Lahir S#498 dari pemecahan `lib/config-registry.ts`.
// Sumbu: berkas ini melayani LAYAR (SA melihat & menyunting daftar setelan) dan memulangkan
//   baris utuh; induknya melayani APLIKASI (membaca satu nilai untuk mengambil keputusan).
//   Dua alasan berubah yang berbeda ⇒ dua rumah.
// ⛔ Isi di bawah dipindah MEKANIS oleh program — nol karakter diketik ulang.

import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { ConfigRegistryFullItem } from '@/lib/types/config-registry.types'

// ─── FUNGSI 6: getConfigPageItems ───────────────────────────────────────────────
/**
 * Ambil semua item config_registry untuk satu feature_key — data LENGKAP untuk UI.
 *
 * Berbeda dengan getConfigValues() yang hanya return { policy_key: nilai }:
 *   - Return full row: label, tipe_data, nilai_enum, tenant_can_override, is_active, kategori
 *   - Tidak filter is_active — SA wajib lihat semua item (aktif maupun tidak) per pola S#110.
 *     (Filter is_active hanya dipakai saat sistem MENGEKSEKUSI feature di runtime,
 *      bukan di halaman management SuperAdmin.)
 *
 * Dipakai oleh RSC page settings:
 *   - security-login/page.tsx (PV-09 fix S#177)
 *   - multi-role-policy/page.tsx (PV-10 fix S#177)
 *   - platform-general/page.tsx (proaktif fix S#177)
 *
 * Cache: unstable_cache TTL 300s, tag 'config' — identik dengan getConfigValues().
 * Invalidasi otomatis saat revalidateTag('config') dipanggil di PATCH /api/config.
 * React cache() untuk deduplikasi per-request render (in-request dedup).
 */
export const getConfigPageItems = cache(
  unstable_cache(
    async (featureKey: string): Promise<ConfigRegistryFullItem[]> => {
      try {
        const db = createServerSupabaseClient()
        const { data, error } = await db
          .from('config_registry')
          .select('id, feature_key, policy_key, label, nilai, tipe_data, nilai_enum, tenant_can_override, is_active, kategori')
          .eq('feature_key', featureKey)
          .is('tenant_id', null)
          .order('label', { ascending: true })

        if (error) {
          console.error(`[config-registry] getConfigPageItems(${featureKey}):`, error.message)
          return []
        }

        return (data ?? []) as ConfigRegistryFullItem[]
      } catch (err) {
        console.error(`[config-registry] getConfigPageItems error:`, err)
        return []
      }
    },
    ['config-page-items'],
    { tags: ['config'], revalidate: 300 }
  )
)

// ─── FUNGSI 7: getConfigItemsByKategori ──────────────────────────────────────
/**
 * Ambil semua item config_registry berdasarkan kolom `kategori` — LINTAS feature_key.
 *
 * Dibuat: Sesi #299 — Opsi A fix loadCapacityConfig di Deep Metrics.
 * Problem: 9 item capacity_* masing-masing punya feature_key sendiri (capacity_supabase_db,
 *   capacity_vercel, dst). getConfigPageItems(fk) tidak bisa ambil semuanya sekaligus.
 * Solusi: query by kategori='Monitoring' → return semua 9 capacity_* + vercel_plan sekaligus.
 *
 * Perbedaan vs getConfigPageItems():
 *   - getConfigPageItems: filter by feature_key (satu grup)
 *   - getConfigItemsByKategori: filter by kategori (lintas feature_key, satu domain)
 *
 * Cache: unstable_cache TTL 300s, tag 'config' — sama dengan fungsi config lainnya.
 * Invalidasi otomatis saat revalidateTag('config') dipanggil di PATCH /api/config.
 *
 * @param kategori - nilai kolom kategori di config_registry (case-sensitive, misal 'Monitoring')
 */
export const getConfigItemsByKategori = cache(
  unstable_cache(
    async (kategori: string): Promise<ConfigRegistryFullItem[]> => {
      try {
        const db = createServerSupabaseClient()
        const { data, error } = await db
          .from('config_registry')
          .select('id, feature_key, policy_key, label, nilai, tipe_data, nilai_enum, tenant_can_override, is_active, kategori')
          .eq('kategori', kategori)
          .is('tenant_id', null)
          .order('feature_key', { ascending: true })

        if (error) {
          console.error(`[config-registry] getConfigItemsByKategori(${kategori}):`, error.message)
          return []
        }

        return (data ?? []) as ConfigRegistryFullItem[]
      } catch (err) {
        console.error(`[config-registry] getConfigItemsByKategori error:`, err)
        return []
      }
    },
    ['config-items-by-kategori'],
    { tags: ['config'], revalidate: 300 }
  )
)

