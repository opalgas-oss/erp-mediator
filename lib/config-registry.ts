// lib/config-registry.ts
// Satu-satunya pintu server-side untuk membaca nilai dari Modul Konfigurasi.
// Tabel: config_registry — dikelola SuperAdmin via Dashboard Modul Konfigurasi.
//
// 3 MODUL DASHBOARD SUPERADMIN:
//   1. Modul Konfigurasi → tabel config_registry    ← file ini
//   2. Modul Pesan       → tabel message_library    ← lib/message-library.ts
//   3. Modul API         → tabel instance_credentials ← lib/credential-reader.ts
//
// CACHING STRATEGY (Update Sesi #060, Revisi Sesi #146):
//   SEBELUMNYA (S#060): module-level Map dengan TTL 5 menit untuk getConfigValues.
//   Komentar S#060 menyebut unstable_cache tidak efektif — ini TIDAK BERLAKU lagi
//   sejak Next.js 14.2 + Vercel Fluid Compute (Vercel Data Cache survive cold restart).
//
//   STATUS SAAT INI (S#146 — Fix A + Fix B SELESAI):
//   - getActiveSidebarFeatureKeys: unstable_cache TTL 1800s, tag 'sidebar-data' [Fix A]
//     → survive cold restart via Vercel Data Cache
//   - getConfigValues: unstable_cache TTL 300s, tag 'config' [Fix B]
//     → survive cold restart via Vercel Data Cache
//   - invalidateConfigCache(): thin wrapper revalidateTag (backward compat) [Fix B]
//   - SuperAdmin update config → revalidateTag di PATCH /api/config → invalidasi benar
//
// Update: Sesi #177 — PV-09+PV-10+proaktif platform-general:
//   Tambah getConfigPageItems() + ConfigRegistryFullItem — untuk RSC page settings.
//   Menggantikan direct db.from('config_registry') di 3 RSC page settings.

import 'server-only'
import { cache } from 'react'
import { unstable_cache, revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

export interface ConfigRegistryItem {
  id:         string
  policy_key: string | null
  label:      string
  nilai:      string
  tipe_data:  string
  nilai_enum: string[] | null
  is_active:  boolean
}

/**
 * Full row data config_registry untuk rendering halaman settings SA.
 * Berbeda dengan ConfigRegistryItem yang tidak punya feature_key, tenant_can_override, kategori.
 * Dipakai oleh getConfigPageItems() — fix PV-09+PV-10+proaktif S#177.
 */
export interface ConfigRegistryFullItem {
  id:                  string
  feature_key:         string
  policy_key:          string | null
  label:               string
  nilai:               string
  tipe_data:           string
  nilai_enum:          string[] | null
  tenant_can_override: boolean
  is_active:           boolean
  kategori:            string | null
}

// ─── FUNGSI: invalidateConfigCache ───────────────────────────────────────────
/**
 * Hapus cache untuk featureKey tertentu.
 * Wajib dipanggil dari API route saat SuperAdmin update config di dashboard.
 * Contoh: setelah PATCH /api/config/security_login → invalidateConfigCache('security_login')
 *
 * FIX Sesi #146 — BUG-015 Tahap 2 Iterasi 2 (Fix B):
 *   Sebelumnya: Map.delete(featureKey) atau Map.clear()
 *   Sekarang: revalidateTag — invalidasi Vercel Data Cache (out-of-process, persist)
 *   Route handlers di /api/config sudah memanggil revalidateTag secara langsung juga.
 *   invalidateConfigCache() dipertahankan untuk backward compat sebagai thin wrapper.
 *
 * @param featureKey - key modul config yang diupdate (misal 'security_login')
 */
export function invalidateConfigCache(featureKey?: string): void {
  if (featureKey) {
    revalidateTag(`config:${featureKey}`, 'default')
  }
  // revalidateTag('config') sudah dipanggil di route handler — tidak duplikasi
}

// ─── FUNGSI: getActiveSidebarFeatureKeys ──────────────────────────────────────
/**
 * Ambil daftar feature_key aktif dari config_registry untuk sidebar SA.
 * Di-cache via Vercel Data Cache (unstable_cache) TTL 1800 detik, tag 'sidebar-data'.
 * Cache ini survive cold restart lambda — tidak hit DB setiap cold start.
 * Invalidasi otomatis saat revalidateTag('sidebar-data') dipanggil di PATCH /api/config.
 *
 * FIX Sesi #146 — BUG-015 Tahap 2 Iterasi 2 (Fix A):
 *   Menggantikan raw Supabase query di fetchSidebarData() di layout SA.
 *   Raw query sebelumnya hit DB setiap request (warm maupun cold) tanpa cache.
 */
export const getActiveSidebarFeatureKeys = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const db = createServerSupabaseClient()
      const { data } = await db
        .from('config_registry')
        .select('feature_key')
        .is('tenant_id', null)
        .eq('is_active', true)
      const keys = [...new Set((data ?? []).map((r: { feature_key: string }) => r.feature_key))]
      return keys.length > 0 ? keys : ['security_login']
    } catch {
      return ['security_login']
    }
  },
  ['sidebar-feature-keys'],
  { tags: ['sidebar-data'], revalidate: 1800 }
)

// ─── FUNGSI 1: getConfigValues ────────────────────────────────────────────────
/**
 * Baca semua nilai untuk satu feature_key sekaligus.
 * Return map { policy_key: nilai }
 *
 * FIX Sesi #146 — BUG-015 Tahap 2 Iterasi 2 (Fix B):
 *   Sebelumnya: module-level Map TTL 5 menit (hilang tiap cold restart lambda).
 *   Sekarang: unstable_cache TTL 300s, tag 'config' — survive cold restart via Vercel Data Cache.
 *   React cache() tetap dipertahankan untuk deduplikasi per-request render (in-request).
 *
 * Contoh: getConfigValues('security_login') → { max_login_attempts: '5', ... }
 */
// Lapisan 1: React cache() — deduplikasi dalam 1 render tree (per-request, in-memory)
// Lapisan 2: unstable_cache — Vercel Data Cache, TTL 300s, survive cold restart (cross-request)
export const getConfigValues = cache(
  unstable_cache(
    async (featureKey: string): Promise<Record<string, string>> => {
      try {
        const db = createServerSupabaseClient()
        const { data, error } = await db
          .from('config_registry')
          .select('policy_key, nilai')
          .eq('feature_key', featureKey)
          .is('tenant_id', null)
          .eq('is_active', true)
          .not('policy_key', 'is', null)

        if (error) {
          console.error(`[config-registry] getConfigValues(${featureKey}):`, error.message)
          return {}
        }

        const map: Record<string, string> = {}
        for (const row of data ?? []) {
          if (row.policy_key) map[row.policy_key] = row.nilai
        }
        return map

      } catch (err) {
        console.error(`[config-registry] getConfigValues error:`, err)
        return {}
      }
    },
    ['config-values'],
    { tags: ['config'], revalidate: 300 }
  )
)

// ─── FUNGSI 2: getConfigValue ─────────────────────────────────────────────────
/**
 * Baca satu nilai dari config_registry berdasarkan policy_key.
 * Menggunakan getConfigValues() di bawahnya — manfaatkan cache yang sama.
 */
export async function getConfigValue(
  featureKey: string,
  policyKey:  string,
  fallback?:  string
): Promise<string | null> {
  const map = await getConfigValues(featureKey)
  return map[policyKey] ?? fallback ?? null
}

// ─── FUNGSI 3: parseConfigNumber ─────────────────────────────────────────────
/**
 * Parse nilai string dari DB ke number dengan fallback aman.
 */
export function parseConfigNumber(nilai: string | null | undefined, fallback: number): number {
  if (nilai === null || nilai === undefined) return fallback
  const n = Number(nilai)
  return isNaN(n) ? fallback : n
}

// ─── FUNGSI 4: parseConfigBoolean ────────────────────────────────────────────
/**
 * Parse nilai string dari DB ke boolean dengan fallback aman.
 */
export function parseConfigBoolean(nilai: string | null | undefined, fallback: boolean): boolean {
  if (nilai === null || nilai === undefined) return fallback
  return nilai === 'true'
}

// ─── FUNGSI 5: getPlatformTimezone ───────────────────────────────────────────
/**
 * Baca timezone dari config_registry — JANGAN hardcode 'Asia/Jakarta' di kode manapun.
 *
 * Arsitektur 3-level:
 *   Level 1 — Platform default : config_registry (platform_general.platform_timezone) ← AKTIF
 *   Level 2 — Per-tenant       : tenants.timezone                                     ← Sprint berikutnya
 *   Level 3 — Per-user         : user_profiles.timezone                               ← Sprint lanjutan
 */
export async function getPlatformTimezone(): Promise<string> {
  const tz = await getConfigValue('platform_general', 'platform_timezone', 'Asia/Jakarta')
  return tz ?? 'Asia/Jakarta'
}

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
