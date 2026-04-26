// app/dashboard/superadmin/layout.tsx
//
// PERUBAHAN Sesi #045 — Fix Performa:
//   - getSidebarData: 3 query sequential → Promise.all paralel
//   - getSidebarData: dibungkus unstable_cache
//   - Cache diinvalidasi via revalidateTag('sidebar-data') di PATCH /api/config
//
// PERUBAHAN Sesi #064 — Fix Layout Performance:
//   - unstable_cache dipindah ke MODULE LEVEL (bukan di dalam component function)
//   - getConfigValue() untuk baca TTL DIHAPUS dari hot path
//   - TTL fixed 1800 detik — sama dengan nilai di DB, tidak perlu baca DB tiap request
//   - Alasan: platform_general.sidebar_cache_ttl_seconds tidak diekspos di UI SA manapun
//     sehingga fitur "TTL configurable dari UI" belum pernah ada secara praktis
//   - revalidateTag('sidebar-data') di PATCH /api/config TETAP bekerja — SA update config
//     akan tetap invalidate cache sidebar secara explicit
//   - Saving: eliminasi 1 await getConfigValue() ~50-80ms cold start per request dashboard

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { DashboardShell }             from '@/components/DashboardShell'

// ─── fetchSidebarData — data platform-level, sama untuk semua SA ──────────────
async function fetchSidebarData(): Promise<{
  brandName:   string
  messages:    Record<string, string>
  featureKeys: string[]
}> {
  try {
    const db = createServerSupabaseClient()

    // Paralel — 3 query jalan bersamaan, bukan sequential
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

// ─── Module-level cache — dibuat SEKALI, tidak dibuat ulang tiap render ───────
// TTL 1800 detik (30 menit) — konsisten dengan nilai platform_general di DB
// Tag 'sidebar-data' dipakai oleh PATCH /api/config untuk explicit invalidation
const getSidebarData = unstable_cache(
  fetchSidebarData,
  ['sidebar-data'],
  { revalidate: 1800, tags: ['sidebar-data'] }
)

// ─── Layout ───────────────────────────────────────────────────────────────────
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  // verifyJWT() membaca x-user-* headers dari middleware — skip getUser() ke Supabase
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'SUPERADMIN') redirect('/login')

  // getSidebarData() — module-level unstable_cache, tidak ada DB call jika cache warm
  const { brandName, messages, featureKeys } = await getSidebarData()

  return (
    <DashboardShell brandName={brandName} messages={messages} featureKeys={featureKeys}>
      {children}
    </DashboardShell>
  )
}
