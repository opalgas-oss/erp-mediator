// lib/dashboard-data.ts
// Shared data fetching untuk semua dashboard layout (SA, Vendor, AdminTenant, dst).
//
// DIBUAT Sesi #065 — BUG-013:
//   Lahir dari pelanggaran ATURAN 11 — vendor/layout.tsx dan superadmin/layout.tsx
//   masing-masing fetch tenants.nama_brand sendiri, tidak shared. Akibatnya:
//   2 cache entry terpisah, tidak saling menguntungkan antar role.
//
// FIX CACHE Sesi #067:
//   Module-level Map diganti unstable_cache — mengikuti pola message-library.ts.
//   Sebab: module-level Map hanya hidup di RAM satu serverless instance.
//   Vercel bisa spin up instance baru kapan saja → Map kosong → DB query ulang → 800ms.
//   unstable_cache disimpan di Vercel Data Cache (shared lintas semua instance) → fast lintas cold start.
//   Invalidasi: revalidateTag('brand-name') — dipanggil saat SA update nama brand.
//
// PENTING:
//   File ini HANYA berisi data yang truly shared antar role.
//   Data spesifik per role (featureKeys SA, status vendor) tetap di layout masing-masing.

import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { createServerSupabaseClient }    from '@/lib/supabase-server'

// ─── Konstanta ────────────────────────────────────────────────────────────────

const BRAND_CACHE_TTL_S = 30 * 60  // 30 menit dalam detik (unstable_cache pakai detik)
const BRAND_CACHE_TAG   = 'brand-name'

// ─── FUNGSI INTERNAL: fetchBrandNameFromDB ────────────────────────────────────
// Tidak di-export — hanya dipanggil via getBrandName() yang sudah di-wrap cache.

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

// ─── FUNGSI 1: getBrandName ───────────────────────────────────────────────────

/**
 * Ambil nama brand platform dari tabel tenants.
 * Di-cache via unstable_cache (Vercel Data Cache) selama 30 menit.
 * Cache ini shared lintas semua serverless instance — tidak hilang saat cold start.
 *
 * Dipakai oleh:
 *   - app/dashboard/superadmin/layout.tsx
 *   - app/dashboard/vendor/layout.tsx
 *   - app/dashboard/admin-tenant/layout.tsx (saat dibuat)
 *
 * @returns nama brand dari DB, fallback 'ERP Mediator' jika DB tidak tersedia
 */
export async function getBrandName(): Promise<string> {
  const cached = unstable_cache(
    fetchBrandNameFromDB,
    ['brand-name'],
    {
      revalidate: BRAND_CACHE_TTL_S,
      tags: [BRAND_CACHE_TAG],
    }
  )
  return cached()
}

// ─── FUNGSI 2: invalidateBrandCache ──────────────────────────────────────────

/**
 * Invalidasi cache brand name via revalidateTag.
 * Wajib dipanggil dari server action / API route saat SuperAdmin update nama brand.
 * Setelah dipanggil, request berikutnya ke getBrandName() akan fetch ulang dari DB.
 */
export function invalidateBrandCache(): void {
  revalidateTag(BRAND_CACHE_TAG)
}
