// lib/config-registry.ts
// Satu-satunya pintu server-side untuk membaca nilai dari Modul Konfigurasi.
// Tabel: config_registry — dikelola SuperAdmin via Dashboard Modul Konfigurasi.
//
// 3 MODUL DASHBOARD SUPERADMIN:
//   1. Modul Konfigurasi → tabel config_registry    ← file ini
//   2. Modul Pesan       → tabel message_library    ← lib/message-library.ts
//   3. Modul API         → tabel instance_credentials ← lib/credential-reader.ts
//
// CACHING STRATEGY (Update Sesi #060):
//   unstable_cache tidak efektif di Vercel serverless — tiap invocation bisa fresh process.
//   Solusi: module-level Map dengan TTL 5 menit.
//   - Warm instance: baca dari Map → 0ms (tidak query DB)
//   - Cold start / TTL expired: query DB → simpan ke Map
//   - SuperAdmin update config → panggil invalidateConfigCache() → Map di-clear untuk key itu
//   Ini pattern umum di aplikasi produksi (Google, Tokopedia, dll).

import 'server-only'
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

// ─── Module-level Cache ───────────────────────────────────────────────────────
// Hidup selama serverless instance masih warm.
// Key: featureKey (misal 'security_login')
// Value: { data: map hasil query, expiredAt: timestamp }

const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000 // 5 menit

interface CacheEntry {
  data:      Record<string, string>
  expiredAt: number
}

const configCache = new Map<string, CacheEntry>()

// ─── FUNGSI: invalidateConfigCache ───────────────────────────────────────────
/**
 * Hapus cache untuk featureKey tertentu.
 * Wajib dipanggil dari API route saat SuperAdmin update config di dashboard.
 * Contoh: setelah PATCH /api/config/security_login → invalidateConfigCache('security_login')
 * @param featureKey - key modul config yang diupdate (misal 'security_login')
 */
export function invalidateConfigCache(featureKey?: string): void {
  if (featureKey) {
    configCache.delete(featureKey)
  } else {
    // Tanpa parameter → invalidate semua
    configCache.clear()
  }
}

// ─── FUNGSI 1: getConfigValues ────────────────────────────────────────────────
/**
 * Baca semua nilai untuk satu feature_key sekaligus.
 * Return map { policy_key: nilai }
 * Di-cache di module-level Map selama 5 menit — tidak query DB setiap request.
 * Contoh: getConfigValues('security_login') → { max_login_attempts: '5', ... }
 */
export async function getConfigValues(featureKey: string): Promise<Record<string, string>> {
  const now    = Date.now()
  const cached = configCache.get(featureKey)

  // Cache hit — return langsung tanpa query DB
  if (cached && now < cached.expiredAt) return cached.data

  // Cache miss / expired — query DB
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
      // Kalau error, return cache lama kalau ada (stale-while-error)
      return cached?.data ?? {}
    }

    const map: Record<string, string> = {}
    for (const row of data ?? []) {
      if (row.policy_key) map[row.policy_key] = row.nilai
    }

    // Simpan ke cache
    configCache.set(featureKey, { data: map, expiredAt: now + CONFIG_CACHE_TTL_MS })
    return map

  } catch (err) {
    console.error(`[config-registry] getConfigValues error:`, err)
    return cached?.data ?? {}
  }
}

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
