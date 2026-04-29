// app/dashboard/vendor/layout.tsx — ARSIP sebelum I-05 Sesi #076
export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getBrandName }               from '@/lib/dashboard-data'
import { VENDOR_LOGIN_ALLOWED }       from '@/lib/constants'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  const db = createServerSupabaseClient()
  const [profileResult, brandName, messages] = await Promise.all([
    db.from('user_profiles').select('status').eq('id', payload.uid).single(),
    getBrandName(),
    getMessagesByKategori(['sidebar_ui', 'header_ui', 'vendor_ui']),
  ])

  const statusVendor = (profileResult.data?.status || '').toUpperCase()
  if (!VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase()).includes(statusVendor)) {
    redirect('/login?error=vendor_not_approved')
  }

  return (
    <VendorDashboardShell brandName={brandName} messages={messages ?? {}}>
      {children}
    </VendorDashboardShell>
  )
}
