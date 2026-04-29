// app/dashboard/vendor/layout.tsx
//
// REFACTOR Sesi #069 — BUG-013 fix:
//   getBrandName() dari lib/dashboard-data.ts (shared, unstable_cache module-level).
//   tenants.nama_brand tidak lagi di-fetch sendiri di layout ini.
//
// UPDATE Sesi #076 — I-05:
//   cekSesiParalel() ditambahkan ke Promise.all yang sudah ada → 0 tambahan latency.
//   Hasilnya diteruskan ke VendorDashboardShell sebagai prop sesiParalel.
//   Jika tidak ada sesi paralel (adaSesi=false): tidak ada perubahan visual.

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getBrandName }               from '@/lib/dashboard-data'
import { VENDOR_LOGIN_ALLOWED, ROLES } from '@/lib/constants'
import { cekSesiParalel }             from '@/app/login/login-session-check'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  const db = createServerSupabaseClient()

  // cekSesiParalel dijalankan PARALLEL dengan query lain → 0 tambahan latency ke RSC
  const [profileResult, brandName, messages, hasilCekSesi] = await Promise.all([
    db.from('user_profiles').select('status').eq('id', payload.uid).single(),
    getBrandName(),
    getMessagesByKategori(['sidebar_ui', 'header_ui', 'vendor_ui']),
    cekSesiParalel(payload.uid, payload.tenantId, ROLES.VENDOR),
  ])

  const statusVendor = (profileResult.data?.status || '').toUpperCase()
  if (!VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase()).includes(statusVendor)) {
    redirect('/login?error=vendor_not_approved')
  }

  // Teruskan data sesi ke VendorDashboardShell hanya jika ada sesi paralel aktif
  const sesiParalel = hasilCekSesi.adaSesi ? hasilCekSesi.sesiData : undefined

  return (
    <VendorDashboardShell
      brandName={brandName}
      messages={messages ?? {}}
      sesiParalel={sesiParalel}
    >
      {children}
    </VendorDashboardShell>
  )
}
