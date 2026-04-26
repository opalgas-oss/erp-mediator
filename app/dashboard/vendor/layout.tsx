// app/dashboard/vendor/layout.tsx
// Layout Vendor Dashboard — server component.
// Dua lapis proteksi:
//   1. verifyJWT() — pastikan authenticated + role === VENDOR
//   2. cek user_profiles.status — hanya APPROVED yang boleh masuk
//
// REFACTOR Sesi #062:
//   Tambah VendorDashboardShell — samakan UI/UX dengan SA dashboard.
//
// PERUBAHAN Sesi #056 — tetap dipertahankan:
//   vendor status check via createServerSupabaseClient()
//   Jika status tidak ada di VENDOR_LOGIN_ALLOWED → redirect /login
//
// PERUBAHAN Sesi #064 — Fix Layout Performance:
//   - Tambah getVendorShellData() di module level dengan unstable_cache
//   - brandName + messages di-cache (platform-level, sama untuk semua vendor)
//   - user_profiles.status TETAP fresh setiap request — security-critical, per-user
//   - Status check diparallelkan dengan getVendorShellData() via Promise.all
//   - Tag 'sidebar-data' dipakai agar PATCH /api/config tetap invalidate cache ini
//   - Saving: warm request hanya 1 DB query (status) bukan 3 DB query

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { VENDOR_LOGIN_ALLOWED }       from '@/lib/constants'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

// ─── fetchVendorShellData — platform-level, sama untuk semua vendor ───────────
// TIDAK termasuk user_profiles.status — itu per-user dan harus selalu fresh
async function fetchVendorShellData(): Promise<{
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

// ─── Module-level cache — dibuat SEKALI, tidak dibuat ulang tiap render ───────
// TTL 1800 detik — konsisten dengan SA layout
// Tag 'sidebar-data' agar PATCH /api/config juga invalidate cache vendor
const getVendorShellData = unstable_cache(
  fetchVendorShellData,
  ['vendor-shell-data'],
  { revalidate: 1800, tags: ['sidebar-data'] }
)

// ─── Layout ───────────────────────────────────────────────────────────────────
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  // verifyJWT() membaca x-user-* headers dari middleware — skip getUser() ke Supabase
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  const db = createServerSupabaseClient()

  // Paralel: status check (HARUS fresh — security) + shell data (cached)
  const [profileResult, shellData] = await Promise.all([
    db.from('user_profiles').select('status').eq('id', payload.uid).single(),
    getVendorShellData(),
  ])

  // Lapis 2 — status vendor harus APPROVED
  const statusVendor = (profileResult.data?.status || '').toUpperCase()
  if (!VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase()).includes(statusVendor)) {
    redirect('/login?error=vendor_not_approved')
  }

  return (
    <VendorDashboardShell brandName={shellData.brandName} messages={shellData.messages}>
      {children}
    </VendorDashboardShell>
  )
}
