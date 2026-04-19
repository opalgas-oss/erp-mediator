// lib/config-registry.ts
// Satu-satunya pintu server-side untuk membaca nilai dari Modul Konfigurasi.
// Tabel: config_registry — dikelola SuperAdmin via Dashboard Modul Konfigurasi.
//
// 3 MODUL DASHBOARD SUPERADMIN:
//   1. Modul Konfigurasi → tabel config_registry    ← file ini
//   2. Modul Pesan       → tabel message_library    ← lib/message-library.ts
//   3. Modul API         → tabel instance_credentials ← lib/credential-reader.ts
//
// ATURAN:
//   - Semua nilai yang bisa diubah SuperAdmin WAJIB dibaca lewat file ini
//   - DILARANG baca platform_policies untuk nilai yang sudah ada di config_registry
//   - platform_policies hanya untuk nilai yang TIDAK ada di config_registry

import 'server-only'
import { unstable_cache } from 'next/cache'
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

// ─── FUNGSI 1: getConfigValues ────────────────────────────────────────────────
// Baca semua nilai untuk satu feature_key sekaligus — satu query untuk semua nilai.
// Return map { policy_key: nilai }
// Contoh: getConfigValues('security_login') → { max_login_attempts: '5', otp_digits: '6', ... }

export async function getConfigValues(featureKey: string): Promise<Record<string, string>> {
  const cached = unstable_cache(
    async () => {
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
    [`config:feature:${featureKey}`],
    { revalidate: 15 * 60, tags: [`config:${featureKey}`, 'config'] }
  )

  return cached()
}

// ─── FUNGSI 2: getConfigValue ─────────────────────────────────────────────────
// Baca satu nilai dari config_registry berdasarkan policy_key.
// Cache 15 menit — di-invalidate saat PATCH /api/config/[feature_key]

export async function getConfigValue(
  featureKey: string,
  policyKey:  string,
  fallback?:  string
): Promise<string | null> {
  const cached = unstable_cache(
    async () => {
      try {
        const db = createServerSupabaseClient()
        const { data, error } = await db
          .from('config_registry')
          .select('nilai')
          .eq('feature_key', featureKey)
          .eq('policy_key', policyKey)
          .is('tenant_id', null)
          .eq('is_active', true)
          .single()

        if (error) {
          console.error(`[config-registry] getConfigValue(${featureKey}, ${policyKey}):`, error.message)
          return null
        }
        return data?.nilai ?? null
      } catch (err) {
        console.error(`[config-registry] getConfigValue error:`, err)
        return null
      }
    },
    [`config:${featureKey}:${policyKey}`],
    { revalidate: 15 * 60, tags: [`config:${featureKey}`, 'config'] }
  )

  const result = await cached()
  return result ?? fallback ?? null
}

// ─── FUNGSI 3: parseConfigNumber ─────────────────────────────────────────────
// Parse nilai string dari DB ke number dengan fallback aman

export function parseConfigNumber(nilai: string | null | undefined, fallback: number): number {
  if (nilai === null || nilai === undefined) return fallback
  const n = Number(nilai)
  return isNaN(n) ? fallback : n
}

// ─── FUNGSI 4: parseConfigBoolean ────────────────────────────────────────────
// Parse nilai string dari DB ke boolean dengan fallback aman

export function parseConfigBoolean(nilai: string | null | undefined, fallback: boolean): boolean {
  if (nilai === null || nilai === undefined) return fallback
  return nilai === 'true'
}
