// lib/policy.ts
// Membaca dan merge policy dari 2 level: Platform Owner + Tenant Admin
// Tabel PostgreSQL: platform_policies (platform level)
//
// PERUBAHAN dari versi Firebase:
//   - Import Firebase → Supabase server client
//   - Query Firestore → query tabel platform_policies PostgreSQL
//   - policyCache (in-memory) → unstable_cache dari next/cache
//   - Tambah import 'server-only'

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ============================================================
// TYPE DEFINITIONS — POLICY PER FITUR
// TIDAK BERUBAH — caller tidak perlu diupdate
// ============================================================

export interface SecurityLoginPolicy {
  max_login_attempts:      number
  lock_duration_minutes:   number
  require_otp:             boolean
  require_biometric_offer: boolean
  session_timeout_minutes: number
  otp_expiry_minutes:      number
  otp_max_attempts:        number
  trusted_device_days:     number
}

export interface ConcurrentSessionPolicy {
  scope: 'all_tenant' | 'per_tenant'
  rule:  'none' | 'different_role_only' | 'always'
}

export interface CommissionPolicy {
  percentage:     number
  minimum_amount: number
  charged_to:     'vendor' | 'customer'
}

export interface TimersPolicy {
  t1_minutes: number
  t2_minutes: number
  t3_minutes: number
}

export interface ActivityLoggingPolicy {
  log_page_views:   boolean
  log_button_clicks: boolean
  log_form_submits: boolean
  log_errors:       boolean
  retention_days:   number
}

export interface PolicyMap {
  security_login:     SecurityLoginPolicy
  concurrent_session: ConcurrentSessionPolicy
  commission:         CommissionPolicy
  timers:             TimersPolicy
  activity_logging:   ActivityLoggingPolicy
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

export async function getEffectivePolicy<K extends keyof PolicyMap>(
  tenantId: string,
  featureKey: K
): Promise<PolicyMap[K]> {
  // unstable_cache: cache berlaku lintas request di Vercel serverless
  // TTL 15 menit — revalidate saat admin update config via revalidateTag()
  const cached = unstable_cache(
    async () => {
      const db = createServerSupabaseClient()

      // Baca platform policy dari tabel platform_policies
      const { data, error } = await db
        .from('platform_policies')
        .select('nilai')
        .eq('feature_key', featureKey)
        .single()

      if (error || !data) {
        throw new Error(
          `Policy platform untuk fitur '${featureKey}' tidak ditemukan. ` +
          `Pastikan tabel platform_policies sudah di-seed.`
        )
      }

      const platformData = data.nilai as Record<string, unknown>

      // Merge logika: platform policy adalah sumber utama
      // Tenant override akan diimplementasikan di Sprint berikutnya
      // saat tabel tenant_policies dibuat
      const merged: Record<string, unknown> = {}

      for (const fieldName of Object.keys(platformData)) {
        if (fieldName.endsWith('_tenant_can_override')) continue
        merged[fieldName] = platformData[fieldName]
      }

      return merged as unknown as PolicyMap[K]
    },
    [`policy:${tenantId}:${featureKey}`],
    { revalidate: 15 * 60, tags: [`policy:${featureKey}`] }
  )

  return cached()
}

export async function getConcurrentSessionRule(
  tenantId: string
): Promise<ConcurrentSessionPolicy> {
  return getEffectivePolicy(tenantId, 'concurrent_session')
}