// app/dashboard/vendor/layout.tsx
//
// REFACTOR Sesi #069 — BUG-013 fix:
//   getBrandName() dari lib/dashboard-data.ts (shared, unstable_cache module-level).
//
// UPDATE Sesi #076 — I-05:
//   cekSesiParalel() ditambahkan ke Promise.all yang sudah ada → 0 tambahan latency.
//   Hasilnya diteruskan ke DashboardShell sebagai prop sesiParalel.
//
// OPTIMASI Sesi #077 — Vendor RSC fix (target <200ms warm):
//   Status vendor dibaca dari JWT claims (payload.vendorStatus) yang di-inject
//   Edge Function v5 (Sesi #075). Skip 1 DB query user_profiles.status per request.
//   Fallback: jika JWT belum punya vendor_status → query DB sebagai safety net.
//
// UPDATE Sesi #079 — DRY fix (BLOK B + B5):
//   - Ganti VendorDashboardShell → DashboardShell generic (VendorDashboardShell dihapus)
//   - VendorSidebarNav di-inject sebagai sidebar ReactNode
//   - Tambah unstable_cache untuk messages (konsisten dengan SA layout)
//   - Cache tag: 'vendor-messages', TTL: 1800 detik (sama dengan SA sidebar-data)

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { unstable_cache }             from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getBrandName }               from '@/lib/dashboard-data'
import { VENDOR_LOGIN_ALLOWED, ROLES } from '@/lib/constants'
import { cekSesiParalel }             from '@/app/login/login-session-check'
import { DashboardShell }             from '@/components/DashboardShell'
import { VendorSidebarNav }           from '@/components/VendorSidebarNav'

// ─── Messages cache — B5 ─────────────────────────────────────────────────────
// Konsisten dengan SA layout (getSidebarData). TTL 1800 detik, tag 'vendor-messages'.
// Diinvalidasi via revalidateTag('vendor-messages') saat message_library diupdate.
const getVendorMessages = unstable_cache(
  () => getMessagesByKategori(['sidebar_ui', 'header_ui', 'vendor_ui']),
  ['vendor-messages'],
  { revalidate: 1800, tags: ['vendor-messages'] }
)

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  // Status vendor: utamakan dari JWT (Edge Function v5), fallback ke DB query.
  const fetchStatusVendor = async (): Promise<string> => {
    if (payload.vendorStatus) return payload.vendorStatus
    const db = createServerSupabaseClient()
    const { data } = await db
      .from('user_profiles')
      .select('status')
      .eq('id', payload.uid)
      .single()
    return data?.status ?? ''
  }

  // Semua query parallel → 0 tambahan latency ke RSC
  const [statusRaw, brandName, messages, hasilCekSesi] = await Promise.all([
    fetchStatusVendor(),
    getBrandName(),
    getVendorMessages(),
    cekSesiParalel(payload.uid, payload.tenantId, ROLES.VENDOR),
  ])

  const statusVendor = (statusRaw || '').toUpperCase()
  if (!VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase()).includes(statusVendor)) {
    redirect('/login?error=vendor_not_approved')
  }

  const sesiParalel = hasilCekSesi.adaSesi ? hasilCekSesi.sesiData : undefined

  return (
    <DashboardShell
      sidebar={
        <VendorSidebarNav
          brandName={brandName}
          messages={messages ?? {}}
        />
      }
      messages={messages ?? {}}
      sesiParalel={sesiParalel}
    >
      {children}
    </DashboardShell>
  )
}
