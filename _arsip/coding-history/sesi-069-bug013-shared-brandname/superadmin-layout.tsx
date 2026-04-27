// ARSIP — app/dashboard/superadmin/layout.tsx
// Snapshot SEBELUM refactor Sesi #069: shared getBrandName() dari lib/dashboard-data.ts
// Tanggal arsip: Sesi #069 — 27 April 2026

// app/dashboard/superadmin/layout.tsx
//
// PERUBAHAN Sesi #045 — Fix Performa (mengacu PERFORMANCE_STANDARDS_v1.md Poin 6.D):
//   - getSidebarData: 3 query sequential → Promise.all paralel
//   - getSidebarData: dibungkus unstable_cache, TTL dibaca dari DB
//     Key: config_registry (platform_general.sidebar_cache_ttl_seconds) — tidak hardcode
//     Fallback: 1800 detik jika key belum ada di DB
//   - Cache diinvalidasi via revalidateTag('sidebar-data') di PATCH /api/config
//
// ROLLBACK Sesi #067:
//   Dikembalikan ke versi Sesi #064 (sebelum shared getBrandName()).
//   Alasan: shared function dashboard menyebabkan regresi SA loading.
//   Akan dipelajari ulang arsitektur yang benar sebelum lanjut.

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getConfigValue }             from '@/lib/config-registry'
import { DashboardShell }             from '@/components/DashboardShell'

async function fetchSidebarData(): Promise<{
  brandName:   string
  messages:    Record<string, string>
  featureKeys: string[]
}> {
  try {
    const db = createServerSupabaseClient()

    const [tenantResult, messages, configResult] = await Promise.all([
      db.from('tenants').select('nama_brand').limit(1).single(),
      getMessagesByKategori(['sidebar_ui', 'page_ui', 'header_ui']),
      db.from('config_registry')
        .select('feature_key')
        .is('tenant_id', null)
        .eq('is_active', true),
    ])

    const featureKeys = [
      ...new Set(
        (configResult.data ?? []).map((r: { feature_key: string }) => r.feature_key)
      ),
    ]

    return {
      brandName:   tenantResult.data?.nama_brand ?? 'ERP Mediator',
      messages:    messages ?? {},
      featureKeys: featureKeys.length > 0 ? featureKeys : ['security_login'],
    }
  } catch {
    return {
      brandName:   'ERP Mediator',
      messages:    {},
      featureKeys: ['security_login'],
    }
  }
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'SUPERADMIN') redirect('/login')

  const ttlStr   = await getConfigValue('platform_general', 'sidebar_cache_ttl_seconds', '1800')
  const revalidate = Number(ttlStr) || 1800

  const getSidebarData = unstable_cache(
    fetchSidebarData,
    ['sidebar-data'],
    { revalidate, tags: ['sidebar-data'] }
  )

  const { brandName, messages, featureKeys } = await getSidebarData()

  return (
    <DashboardShell brandName={brandName} messages={messages} featureKeys={featureKeys}>
      {children}
    </DashboardShell>
  )
}
