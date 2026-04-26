// ARSIP sesi-065-bug013-vendor-rsc/vendor-layout-intermediate.tsx
// Snapshot vendor/layout.tsx versi INTERMEDIATE (fix pertama Sesi #065 — sebelum refactor shared)
// File ini adalah versi yang BELUM pakai shared getBrandName() dari lib/dashboard-data.ts

// app/dashboard/vendor/layout.tsx (intermediate — versi unstable_cache per-layout)

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getConfigValue }             from '@/lib/config-registry'
import { VENDOR_LOGIN_ALLOWED }       from '@/lib/constants'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

async function fetchVendorSidebarData(): Promise<{
  brandName: string
  messages:  Record<string, string>
}> {
  try {
    const db = createServerSupabaseClient()
    const [tenantResult, messages] = await Promise.all([
      db.from('tenants').select('nama_brand').limit(1).single(),
      getMessagesByKategori(['sidebar_ui', 'header_ui', 'vendor_ui']),
    ])
    return {
      brandName: tenantResult.data?.nama_brand ?? 'ERP Mediator',
      messages:  messages ?? {},
    }
  } catch {
    return { brandName: 'ERP Mediator', messages: {} }
  }
}

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  const db = createServerSupabaseClient()
  const profileResult = await db
    .from('user_profiles')
    .select('status')
    .eq('id', payload.uid)
    .single()

  const statusVendor = (profileResult.data?.status || '').toUpperCase()
  if (!VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase()).includes(statusVendor)) {
    redirect('/login?error=vendor_not_approved')
  }

  const ttlStr    = await getConfigValue('platform_general', 'sidebar_cache_ttl_seconds', '1800')
  const revalidate = Number(ttlStr) || 1800

  const getVendorSidebarData = unstable_cache(
    fetchVendorSidebarData,
    ['vendor-sidebar-data'],
    { revalidate, tags: ['vendor-sidebar-data', 'sidebar-data'] }
  )

  const { brandName, messages } = await getVendorSidebarData()

  return (
    <VendorDashboardShell brandName={brandName} messages={messages}>
      {children}
    </VendorDashboardShell>
  )
}
