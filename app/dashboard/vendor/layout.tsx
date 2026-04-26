// app/dashboard/vendor/layout.tsx
// Layout Vendor Dashboard — server component.
// Dua lapis proteksi:
//   1. verifyJWT() — pastikan authenticated + role === VENDOR
//   2. cek user_profiles.status — hanya APPROVED yang boleh masuk
//
// REFACTOR Sesi #062:
//   Tambah VendorDashboardShell — samakan UI/UX dengan SA dashboard.
//
// FIX BUG-013 Sesi #065 (FINAL):
//   brandName → pakai getBrandName() dari lib/dashboard-data.ts (shared, module-level cache).
//   messages  → getMessagesByKategori() sudah punya unstable_cache internal — tidak perlu wrapper.
//   user_profiles.status TETAP fresh (security — tidak boleh di-cache).
//   fetchVendorSidebarData() DIHAPUS — tidak lagi duplikasi logika SA layout.
//
// KENAPA LEBIH BAIK DARI VERSI SEBELUMNYA:
//   SA layout dan Vendor layout kini pakai getBrandName() yang SAMA.
//   Saat SA memperbarui cache brand → Vendor langsung dapat dari cache yang sama (0ms).

export const dynamic = 'force-dynamic'

import { redirect }              from 'next/navigation'
import { verifyJWT }             from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessagesByKategori } from '@/lib/message-library'
import { getBrandName }          from '@/lib/dashboard-data'
import { VENDOR_LOGIN_ALLOWED }  from '@/lib/constants'
import { VendorDashboardShell }  from '@/components/VendorDashboardShell'

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

  // ── Data sidebar — shared cache + internal cache ────────────────────────────
  // getBrandName()          → module-level Map di lib/dashboard-data.ts (shared SA+Vendor)
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
