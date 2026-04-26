// app/dashboard/vendor/layout.tsx
// Layout Vendor Dashboard — server component.
// Dua lapis proteksi:
//   1. verifyJWT() — pastikan authenticated + role === VENDOR
//   2. cek user_profiles.status — hanya APPROVED yang boleh masuk
//
// REFACTOR Sesi #062:
//   Tambah VendorDashboardShell — samakan UI/UX dengan SA dashboard.
//
// FIX BUG-013 Sesi #065:
//   Pisah brandName + messages ke fetchVendorSidebarData() → unstable_cache.
//   user_profiles.status TETAP fresh (security — tidak boleh di-cache).
//   TTL dari config_registry key sidebar_cache_ttl_seconds (tidak hardcode).
//   Pola identik dengan superadmin/layout.tsx.

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getConfigValue }             from '@/lib/config-registry'
import { VENDOR_LOGIN_ALLOWED }       from '@/lib/constants'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

// ─── Data sidebar — bisa di-cache karena tidak berubah per request ────────────
// brandName (tenants) + messages — statis, tidak sensitif terhadap sesi user.
// Pola identik dengan superadmin/layout.tsx fetchSidebarData().
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
    return {
      brandName: 'ERP Mediator',
      messages:  {},
    }
  }
}

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  // ── Lapis 1: verifikasi JWT + role ──────────────────────────────────────────
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  // ── Lapis 2: verifikasi status vendor — TETAP FRESH (security) ─────────────
  // Tidak boleh di-cache: status bisa berubah kapan saja oleh SuperAdmin.
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

  // ── Data sidebar — cached via unstable_cache ────────────────────────────────
  // TTL dibaca dari config_registry — tidak hardcode. Fallback 1800 detik.
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
