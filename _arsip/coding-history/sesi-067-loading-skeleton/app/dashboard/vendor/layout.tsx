// ARSIP — app/dashboard/vendor/layout.tsx
// Snapshot SEBELUM refactor Sesi #067: pisah layout → VendorShellWithData + Suspense
// Lihat _arsip/coding-history/INDEX.md untuk konteks

export const dynamic = 'force-dynamic'

import { redirect }              from 'next/navigation'
import { verifyJWT }             from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori } from '@/lib/message-library'
import { getBrandName }          from '@/lib/dashboard-data'
import { VENDOR_LOGIN_ALLOWED }  from '@/lib/constants'
import { VendorDashboardShell }  from '@/components/VendorDashboardShell'

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

  const [brandName, messages] = await Promise.all([
    getBrandName(),
    getMessagesByKategori(['sidebar_ui', 'header_ui', 'vendor_ui']),
  ])

  return (
    <VendorDashboardShell brandName={brandName} messages={messages ?? {}}>
      {children}
    </VendorDashboardShell>
  )
}
