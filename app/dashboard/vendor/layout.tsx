// app/dashboard/vendor/layout.tsx
// Layout proteksi untuk semua halaman /dashboard/vendor
//
// Dua lapis proteksi:
//   1. verifyJWT() — pastikan user authenticated + role === VENDOR
//   2. cek user_profiles.status — hanya APPROVED yang boleh masuk
//
// Tanpa layer 2: vendor PENDING/REVIEW bisa akses dashboard langsung
// jika punya session aktif (middleware hanya cek role, tidak cek status)
//
// PERUBAHAN Sesi #056 — fix TC-D01:
//   Tambah vendor status check via createServerSupabaseClient()
//   Jika status tidak ada di VENDOR_LOGIN_ALLOWED → redirect /login

export const dynamic = 'force-dynamic'

import { redirect }                  from 'next/navigation'
import { verifyJWT }                 from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { VENDOR_LOGIN_ALLOWED }      from '@/lib/constants'

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  // ── Lapis 1: verifikasi JWT + role ──────────────────────────────────────────
  const payload = await verifyJWT()
  if (!payload || payload.role !== 'VENDOR') redirect('/login')

  // ── Lapis 2: verifikasi status vendor di user_profiles ─────────────────────
  // Pakai service role agar tidak bergantung RLS — ini security check server-side
  const db = createServerSupabaseClient()
  const { data: profile } = await db
    .from('user_profiles')
    .select('status')
    .eq('id', payload.uid)
    .single()

  const statusVendor = (profile?.status || '').toUpperCase()
  const bolehMasuk   = VENDOR_LOGIN_ALLOWED.map(s => s.toUpperCase())

  if (!bolehMasuk.includes(statusVendor)) {
    // Status PENDING/REVIEW/REJECTED/SUSPENDED → paksa logout via redirect
    redirect('/login?error=vendor_not_approved')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
