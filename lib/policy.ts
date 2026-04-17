// lib/policy.ts
// Membaca dan merge policy dari 2 level: Platform Owner + Tenant Admin
// Path Platform: /platform_config/policies/{featureKey}
// Path Tenant:   /tenants/{tenantId}/config/main → policies.{featureKey}
//
// Fungsi utama: getEffectivePolicy(tenantId, featureKey)
// Dipakai SEMUA modul — ini fondasi paling penting di seluruh platform
//
// Cache aktif via lib/cache.ts — TTL 15 menit per policy

import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { policyCache, TTL_PRESETS } from '@/lib/cache'

// ============================================================
// TYPE DEFINITIONS — POLICY PER FITUR
// ============================================================

export interface SecurityLoginPolicy {
  max_login_attempts: number
  lock_duration_minutes: number
  require_otp: boolean
  require_biometric_offer: boolean
  session_timeout_minutes: number
  otp_expiry_minutes: number
  otp_max_attempts: number
  trusted_device_days: number
}

export interface ConcurrentSessionPolicy {
  scope: 'all_tenant' | 'per_tenant'
  rule: 'none' | 'different_role_only' | 'always'
}

export interface CommissionPolicy {
  percentage: number
  minimum_amount: number
  charged_to: 'vendor' | 'customer'
}

export interface TimersPolicy {
  t1_minutes: number
  t2_minutes: number
  t3_minutes: number
}

export interface ActivityLoggingPolicy {
  log_page_views: boolean
  log_button_clicks: boolean
  log_form_submits: boolean
  log_errors: boolean
  retention_days: number
}

export interface PolicyMap {
  security_login:     SecurityLoginPolicy
  concurrent_session: ConcurrentSessionPolicy
  commission:         CommissionPolicy
  timers:             TimersPolicy
  activity_logging:   ActivityLoggingPolicy
}

// ============================================================
// TIPE INTERNAL — DOKUMEN FIRESTORE
// ============================================================

type PlatformPolicyDoc = Record<string, unknown>

interface TenantConfigDoc {
  policies?: Record<string, Record<string, unknown>>
  [key: string]: unknown
}

// ============================================================
// FUNGSI UTAMA
// ============================================================

export async function getEffectivePolicy<K extends keyof PolicyMap>(
  tenantId: string,
  featureKey: K
): Promise<PolicyMap[K]> {
  // ── Cache key unik per kombinasi tenant + feature ─────────────────────────
  const cacheKey = `policy:${tenantId}:${featureKey}`

  return policyCache.getOrFetch(
    cacheKey,
    async () => {
      // ── Langkah 1: Baca platform policy ──────────────────────────────────
      const platformRef  = doc(db, 'platform_config', 'policies', featureKey, 'config')
      const platformSnap = await getDoc(platformRef)

      if (!platformSnap.exists()) {
        throw new Error(
          `Policy platform untuk fitur '${featureKey}' tidak ditemukan di Firestore. ` +
          `Pastikan dokumen /platform_config/policies/${featureKey} sudah ada.`
        )
      }

      const platformData = platformSnap.data() as PlatformPolicyDoc

      // ── Langkah 2: Baca tenant policy ────────────────────────────────────
      const tenantConfigRef  = doc(db, 'tenants', tenantId, 'config', 'main')
      const tenantConfigSnap = await getDoc(tenantConfigRef)

      const tenantOverrides: Record<string, unknown> =
        tenantConfigSnap.exists()
          ? ((tenantConfigSnap.data() as TenantConfigDoc).policies?.[featureKey] ?? {})
          : {}

      // ── Langkah 3: Merge nilai per field ─────────────────────────────────
      const merged: Record<string, unknown> = {}

      for (const fieldName of Object.keys(platformData)) {
        if (fieldName.endsWith('_tenant_can_override')) continue

        const overrideKey      = `${fieldName}_tenant_can_override`
        const tenantCanOverride = platformData[overrideKey] === true

        if (tenantCanOverride && fieldName in tenantOverrides) {
          merged[fieldName] = tenantOverrides[fieldName]
        } else {
          merged[fieldName] = platformData[fieldName]
        }
      }

      return merged as unknown as PolicyMap[K]
    },
    { ttlMs: TTL_PRESETS.FIFTEEN_MINUTES }
  ) as Promise<PolicyMap[K]>
}

export async function getConcurrentSessionRule(
  tenantId: string
): Promise<ConcurrentSessionPolicy> {
  return getEffectivePolicy(tenantId, 'concurrent_session')
}
