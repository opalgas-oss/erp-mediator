// lib/getTenantConfig.ts
// MIGRASI Sesi #037: Firebase/Firestore → Supabase PostgreSQL
//
// File ini dipertahankan agar tidak ada import error di file lain yang masih merujuk.
// Fungsi getTenantConfig digantikan oleh:
//   - lib/policy.ts → getEffectivePolicy(tenantId, featureKey)
//   - lib/config-registry.ts → getConfigValue(featureKey)
//
// Gunakan lib/policy.ts untuk kode baru.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface TenantConfig {
  tenant_id: string
  brand: {
    name:          string
    tagline:       string
    primary_color: string
    logo_url:      string
  }
  commission: {
    percentage:     number
    minimum_amount: number
    charged_to:     'vendor' | 'customer'
  }
  timers: {
    t1_minutes: number
    t2_minutes: number
    t3_minutes: number
  }
  wa_templates: Record<string, string>
  is_active: boolean
}

export async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  if (!tenantId) throw new Error('tenant_id wajib diisi')

  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error || !data) throw new Error(`Tenant '${tenantId}' tidak ditemukan`)

  return {
    tenant_id: data.id,
    brand: {
      name:          data.nama_brand ?? '',
      tagline:       '',
      primary_color: '#2563eb',
      logo_url:      '',
    },
    commission:   { percentage: 10, minimum_amount: 50000, charged_to: 'customer' },
    timers:       { t1_minutes: 15, t2_minutes: 60, t3_minutes: 120 },
    wa_templates: {},
    is_active:    data.status === 'aktif',
  }
}
