// app/dashboard/superadmin/layout.tsx
//
// PERUBAHAN Sesi #045 — Fix Performa (mengacu PERFORMANCE_STANDARDS_v1.md Poin 6.D):
//   - getSidebarData: 3 query sequential → Promise.all paralel
//   - getSidebarData: dibungkus unstable_cache, TTL dibaca dari DB
//     Key: config_registry (platform_general.sidebar_cache_ttl_seconds) — tidak hardcode
//     Fallback: 1800 detik jika key belum ada di DB
//   - Cache diinvalidasi via revalidateTag('sidebar-data') di PATCH /api/config
//
// REFACTOR Sesi #069 — BUG-013 fix:
//   getBrandName() dipindah ke lib/dashboard-data.ts (shared, unstable_cache module-level).
//   fetchSidebarData() tidak lagi fetch tenants.nama_brand sendiri.
//   brandName diambil parallel dengan getSidebarData() di layout component.
//
// UPDATE Sesi #076 — I-05:
//   cekSesiParalel() ditambahkan ke Promise.all yang sudah ada → 0 tambahan latency.
//   Hasilnya diteruskan ke DashboardShell sebagai prop sesiParalel.
//   Jika tidak ada sesi paralel (adaSesi=false): tidak ada perubahan visual.

// UPDATE Sesi #079 — DRY fix (BLOK B):
//   DashboardShell sekarang generic — sidebar di-inject sebagai ReactNode.
//   SidebarNav menerima brandName + messages + featureKeys langsung dari layout.
//   mobileOpen/onMobileClose tidak lagi di-pass — dibaca via useMobileSidebar() context.

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getConfigValue }             from '@/lib/config-registry'
import { getBrandName }               from '@/lib/dashboard-data'
import { cekSesiParalel }             from '@/app/login/login-session-check'
import { ROLES }                      from '@/lib/constants'
import { DashboardShell }             from '@/components/DashboardShell'
import { SidebarNav }                 from '@/components/SidebarNav'

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

  const ttlStr     = await getConfigValue('platform_general', 'sidebar_cache_ttl_seconds', '1800')
  const revalidate = Number(ttlStr) || 1800

  const getSidebarData = unstable_cache(
    fetchSidebarData,
    ['sidebar-data'],
    { revalidate, tags: ['sidebar-data'] }
  )

  // cekSesiParalel dijalankan PARALLEL dengan query lain → 0 tambahan latency ke RSC
  // SA tidak punya tenantId — dikirim string kosong sesuai pattern existing
  const [{ messages, featureKeys }, brandName, hasilCekSesi] = await Promise.all([
    getSidebarData(),
    getBrandName(),
    cekSesiParalel(payload.uid, '', ROLES.SUPERADMIN),
  ])

  // Teruskan data sesi ke DashboardShell hanya jika ada sesi paralel aktif
  const sesiParalel = hasilCekSesi.adaSesi ? hasilCekSesi.sesiData : undefined

  return (
    <DashboardShell
      sidebar={
        <SidebarNav
          brandName={brandName}
          messages={messages}
          featureKeys={featureKeys}
        />
      }
      messages={messages}
      sesiParalel={sesiParalel}
    >
      {children}
    </DashboardShell>
  )
}
