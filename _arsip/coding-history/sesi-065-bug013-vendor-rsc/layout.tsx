// app/dashboard/vendor/layout.tsx
// Layout Vendor Dashboard — server component.
// Dua lapis proteksi (sama seperti sebelumnya):
//   1. verifyJWT() — pastikan authenticated + role === VENDOR
//   2. cek user_profiles.status — hanya APPROVED yang boleh masuk
//
// REFACTOR Sesi #062:
//   Tambah VendorDashboardShell — samakan UI/UX dengan SA dashboard.
//   Fetch brandName + messages untuk sidebar dan header.
//   Sebelumnya: hanya <div min-h-screen bg-gray-50> tanpa shell.
//
// PERUBAHAN Sesi #056 — tetap dipertahankan:
//   vendor status check via createServerSupabaseClient()
//   Jika status tidak ada di VENDOR_LOGIN_ALLOWED → redirect /login

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { VENDOR_LOGIN_ALLOWED }       from '@/lib/constants'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  // ── Lapis 1: verifikasi JWT + role ──────────────────────────────────────────
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  // ── Lapis 2: verifikasi status vendor di user_profiles ─────────────────────
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
