// app/dashboard/superadmin/layout.tsx
//
// PERUBAHAN Sesi #045 — Fix Performa:
//   - fetchSidebarData: 3 query sequential → Promise.all paralel
//   - fetchSidebarData: dibungkus unstable_cache, TTL dibaca dari DB
//
// PERUBAHAN Sesi #065 — Shared getBrandName():
//   - tenants query DIHAPUS dari fetchSidebarData()
//   - brandName kini pakai getBrandName() dari lib/dashboard-data.ts
//   - Shared antara SA dan Vendor: 1 cache entry, bukan 2
//   - fetchSidebarData kini hanya berisi data SA-spesifik: messages + featureKeys

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getConfigValue }             from '@/lib/config-registry'
import { getBrandName }               from '@/lib/dashboard-data'
import { DashboardShell }             from '@/components/DashboardShell'

// ─── Data SA-spesifik — unstable_cache ────────────────────────────────────────
// featureKeys dari config_registry — spesifik SA, bukan shared.
// messages sudah punya internal cache di getMessagesByKategori().
// brandName TIDAK lagi di sini — sudah di lib/dashboard-data.ts (shared).
async function fetchSidebarData(): Promise<{
  messages:    Record<string, string>
  featureKeys: string[]
}> {
  try {
    const db = createServerSupabaseClient()

    const [messages, configResult] = await Promise.all([
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
      messages:    messages ?? {},
      featureKeys: featureKeys.length > 0 ? featureKeys : ['security_login'],
    }
  } catch {
    return {
      messages:    {},
      featureKeys: ['security_login'],
    }
  }
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'SUPERADMIN') redirect('/login')

  // Baca TTL sidebar cache dari config_registry — tidak hardcode
  const ttlStr     = await getConfigValue('platform_general', 'sidebar_cache_ttl_seconds', '1800')
  const revalidate = Number(ttlStr) || 1800

  // unstable_cache untuk data SA-spesifik (featureKeys + messages)
  const getSidebarData = unstable_cache(
    fetchSidebarData,
    ['sidebar-data'],
    { revalidate, tags: ['sidebar-data'] }
  )

  // brandName dari shared cache — parallel dengan getSidebarData
  const [{ messages, featureKeys }, brandName] = await Promise.all([
    getSidebarData(),
    getBrandName(),
  ])

  return (
    <DashboardShell brandName={brandName} messages={messages} featureKeys={featureKeys}>
      {children}
    </DashboardShell>
  )
}
