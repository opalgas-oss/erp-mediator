// lib/dashboard-data.ts
// Shared data fetching untuk semua dashboard layout (SA, Vendor, AdminTenant, dst).
//
// DIBUAT Sesi #065 — BUG-013:
//   Lahir dari pelanggaran ATURAN 11 — vendor/layout.tsx dan superadmin/layout.tsx
//   masing-masing fetch tenants.nama_brand sendiri, tidak shared.
//
// FIX CACHE Sesi #067:
//   Module-level Map diganti unstable_cache — mengikuti pola message-library.ts.
//   unstable_cache wrapper dibuat di MODULE LEVEL agar cache key stabil.
//   Cache disimpan di Vercel Data Cache (shared lintas semua instance).
//
//   Invalidasi brand cache:
//   JANGAN panggil revalidateTag di sini — harus dari Server Action / Route Handler.
//   Export BRAND_CACHE_TAG → import di Server Action → panggil revalidateTag(BRAND_CACHE_TAG) di sana.
//
// PENTING:
//   File ini HANYA berisi data yang truly shared antar role.
//   Data spesifik per role (featureKeys SA, status vendor) tetap di layout masing-masing.

import 'server-only'
import { unstable_cache }          from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Konstanta (di-export agar Server Action bisa pakai untuk revalidateTag) ──

export const BRAND_CACHE_TAG   = 'brand-name'
const        BRAND_CACHE_TTL_S = 30 * 60  // 30 menit dalam detik

// ─── FUNGSI INTERNAL: fetchBrandNameFromDB ────────────────────────────────────
// Tidak di-export — hanya dipanggil via getCachedBrandName di bawah.

async function fetchBrandNameFromDB(): Promise<string> {
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
}

// ─── MODULE-LEVEL CACHE WRAPPER ───────────────────────────────────────────────
// WAJIB di module level — bukan di dalam fungsi.
// Kalau di dalam fungsi: cache key baru setiap call → cache tidak pernah hit.

const getCachedBrandName = unstable_cache(
  fetchBrandNameFromDB,
  ['brand-name'],
  {
    revalidate: BRAND_CACHE_TTL_S,
    tags:       [BRAND_CACHE_TAG],
  }
)

// ─── FUNGSI 1: getBrandName ───────────────────────────────────────────────────

/**
 * Ambil nama brand platform dari tabel tenants.
 * Di-cache via unstable_cache (Vercel Data Cache) selama 30 menit.
 * Cache shared lintas semua serverless instance — tidak hilang saat cold start.
 *
 * Dipakai oleh:
 *   - app/dashboard/superadmin/layout.tsx
 *   - app/dashboard/vendor/layout.tsx
 *   - app/dashboard/admin-tenant/layout.tsx (saat dibuat)
 *
 * Untuk invalidasi cache dari Server Action:
 *   import { BRAND_CACHE_TAG } from '@/lib/dashboard-data'
 *   import { revalidateTag }   from 'next/cache'
 *   revalidateTag(BRAND_CACHE_TAG)
 *
 * @returns nama brand dari DB, fallback 'ERP Mediator' jika DB tidak tersedia
 */
export async function getBrandName(): Promise<string> {
  return getCachedBrandName()
}
