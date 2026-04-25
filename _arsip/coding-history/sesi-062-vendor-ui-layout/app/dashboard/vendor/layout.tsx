// ARSIP SESI #062 — app/dashboard/vendor/layout.tsx
// Alasan: Rewrite menjadi async server component dengan VendorDashboardShell
// (samakan UI/UX dengan SA dashboard — keputusan Philips Sesi #062)
export const dynamic = 'force-dynamic'

import { redirect }                  from 'next/navigation'
import { verifyJWT }                 from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { VENDOR_LOGIN_ALLOWED }      from '@/lib/constants'

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  const db = createServerSupabaseClient()
  const { data: profile } = await db
    .from('user_profiles')
    .select('status')
    .eq('id', payload.uid)
    .single()

  const statusVendor = (profile?.status || '').toUpperCase()
  const bolehMasuk   = VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase())

  if (!bolehMasuk.includes(statusVendor)) {
    redirect('/login?error=vendor_not_approved')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
