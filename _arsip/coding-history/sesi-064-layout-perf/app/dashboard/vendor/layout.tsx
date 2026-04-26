// ⚠️ ARSIP SESI #064 — SEBELUM FIX LAYOUT PERFORMANCE
// File asli: app/dashboard/vendor/layout.tsx
// Snapshot: 27 April 2026
// Masalah: tidak ada caching untuk brandName + messages — 3 DB query fresh setiap request

// app/dashboard/vendor/layout.tsx
export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { VENDOR_LOGIN_ALLOWED }       from '@/lib/constants'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  const db = createServerSupabaseClient()

  const [profileResult, tenantResult, messages] = await Promise.all([
    db.from('user_profiles').select('status').eq('id', payload.uid).single(),
    db.from('tenants').select('nama_brand').limit(1).single(),
    getMessagesByKategori(['sidebar_ui', 'header_ui', 'vendor_ui']),
  ])

  const statusVendor = (profileResult.data?.status || '').toUpperCase()
  if (!VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase()).includes(statusVendor)) {
    redirect('/login?error=vendor_not_approved')
  }

  const brandName = tenantResult.data?.nama_brand ?? 'ERP Mediator'

  return (
    <VendorDashboardShell brandName={brandName} messages={messages ?? {}}>
      {children}
    </VendorDashboardShell>
  )
}
