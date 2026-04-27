// app/dashboard/vendor/VendorShellWithData.tsx
//
// DIBUAT Sesi #067 — Loading Skeleton (Streaming):
//   Async Server Component yang berisi semua logic auth + data fetch vendor.
//   Dipisah dari VendorLayout agar layout bisa menjadi pure static wrapper
//   yang membungkus komponen ini dengan <Suspense fallback={<VendorLoading />}>.
//
//   Selama komponen ini menunggu (verifyJWT + DB + getBrandName),
//   user melihat VendorLoading skeleton.
//   Setelah selesai, skeleton diganti shell asli via streaming.
//
// SECURITY: Dua lapis proteksi tetap ada:
//   1. verifyJWT() — pastikan authenticated + role === VENDOR
//   2. cek user_profiles.status — hanya APPROVED yang boleh masuk
//   Keduanya tidak di-cache (fresh setiap request) — sama seperti sebelumnya.

export const dynamic = 'force-dynamic'

import { redirect }                   from 'next/navigation'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori }      from '@/lib/message-library'
import { getBrandName }               from '@/lib/dashboard-data'
import { VENDOR_LOGIN_ALLOWED }       from '@/lib/constants'
import { VendorDashboardShell }       from '@/components/VendorDashboardShell'

export default async function VendorShellWithData({ children }: { children: React.ReactNode }) {
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

  // ── Data sidebar — shared cache + internal cache ────────────────────────────
  // getBrandName()          → unstable_cache di lib/dashboard-data.ts (shared SA+Vendor)
  // getMessagesByKategori() → unstable_cache internal di lib/message-library.ts
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
