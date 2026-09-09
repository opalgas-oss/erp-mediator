// lib/config-registry.ts
// Satu-satunya pintu server-side untuk membaca NILAI setelan dari Modul Konfigurasi.
// Tabel: config_registry — dikelola SuperAdmin via Dashboard Modul Konfigurasi.
//
// 🔴 DIPECAH S#498. Sebabnya diukur, bukan dirasa: berkas ini 13.497 B = 131,8% plafon kode
//   10.240 B (164,8% ambang tindakan 8.192 B), dan perbaikan hutang #134 pasti menyentuhnya.
//   Pola sama dengan K11 (S#496, vendor-register.service.ts) dan K-497-T2 (S#497,
//   form-field-ketergantungan.util.ts): PECAH DULU di commit tersendiri, baru tulis.
//   Sumbu = ALASAN BERUBAH (ATURAN 54.2/54.4), jadi empat berkas:
//     bentuk kolom tabel      → lib/types/config-registry.types.ts
//     aturan penerjemah nilai → lib/utils/config-nilai.util.ts
//     pembaca sidebar SA      → lib/config-sidebar.ts
//     pembaca baris penuh SA  → lib/config-registry-item.ts
//   Berkas ini tetap PINTU MASUK: keempatnya di-ekspor ulang di bawah supaya 46 berkas
//   pemanggil nol disentuh (ATURAN 36 — menunjuk, bukan menyalin).
//
// 3 MODUL DASHBOARD SUPERADMIN:
//   1. Modul Konfigurasi → tabel config_registry    ← file ini
//   2. Modul Pesan       → tabel message_library    ← lib/message-library.ts
//   3. Modul API         → tabel instance_credentials ← lib/credential-reader.ts
//
// CACHING: getConfigValues unstable_cache TTL 300s tag 'config' (Fix B, S#146).
//   invalidateConfigCache() = thin wrapper revalidateTag. SuperAdmin update config →
//   revalidateTag di PATCH /api/config → invalidasi benar.
//   Riwayat lengkap S#060/#146/#177/#299 → ARSIP/config-registry__sebelum-S498.ts

import 'server-only'
import { cache } from 'react'
import { unstable_cache, revalidateTag } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── EKSPOR ULANG — rumah tunggalnya di berkas lain, ini hanya penunjuk (ATURAN 36) ─────
export type { ConfigRegistryItem, ConfigRegistryFullItem } from '@/lib/types/config-registry.types'
export { parseConfigNumber, parseConfigBoolean } from '@/lib/utils/config-nilai.util'
export { getActiveSidebarFeatureKeys } from '@/lib/config-sidebar'
export { getConfigPageItems, getConfigItemsByKategori } from '@/lib/config-registry-item'

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

