// lib/dashboard-data.ts
//
// Shared data fetching untuk semua dashboard role (SA, Vendor, dll).
// Dibuat Sesi #069 — fix BUG-013 (Vendor RSC cold start).
//
// ARSITEKTUR: unstable_cache di MODULE LEVEL (bukan di dalam fungsi komponen).
// Ini memastikan satu instance cache dipakai bersama oleh semua layout yang import modul ini.
// Terbukti benar Sesi #067 sebelum rollback: Vendor RSC 244ms, SA warm 156ms.
//
// PERBEDAAN dari pendekatan sebelumnya yang di-rollback:
//   - Sesi #065: unstable_cache di dalam fetchVendorSidebarData() di vendor/layout.tsx
//     → cache terpisah per layout, tidak berbagi → Vendor 608ms (hanya -65ms)
//   - Sesi #067: unstable_cache MODULE LEVEL di sini → cache satu instance bersama
//     → SA warm 156ms, Vendor 244ms ✅ — di-rollback karena SA cold start 603ms
//     disalahpahami sebagai regresi, padahal cold start = normal Vercel Hobby Plan

import { unstable_cache }             from 'next/cache'
import { revalidateTag }              from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── getBrandName ──────────────────────────────────────────────────────────────
// Ambil nama brand dari tabel tenants dengan cache module-level.
// Dipakai oleh: superadmin/layout.tsx, vendor/layout.tsx
// Cache key: 'brand-name' | Tag: 'brand-name' | TTL: 1800 detik (30 menit)
export const getBrandName = unstable_cache(
  async (): Promise<string> => {
    try {
      const db = createServerSupabaseClient()
      const { data } = await db
        .from('tenants')
        .select('nama_brand')
        .limit(1)
        .single()
      return data?.nama_brand ?? 'ERP Mediator'
    } catch {
      return 'ERP Mediator'
    }
  },
  ['brand-name'],
  { revalidate: 1800, tags: ['brand-name'] }
)

// ── invalidateBrandCache ──────────────────────────────────────────────────────
// Invalidasi cache brand name — panggil saat nama brand diupdate via config/admin.
export function invalidateBrandCache(): void {
  revalidateTag('brand-name', 'default')
}
