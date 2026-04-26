// lib/dashboard-data.ts
// Shared data fetching untuk semua dashboard layout (SA, Vendor, AdminTenant, dst).
//
// DIBUAT Sesi #065 — BUG-013:
//   Lahir dari pelanggaran ATURAN 11 — vendor/layout.tsx dan superadmin/layout.tsx
//   masing-masing fetch tenants.nama_brand sendiri, tidak shared. Akibatnya:
//   2 cache entry terpisah, tidak saling menguntungkan antar role.
//
// STRATEGI CACHE:
//   Module-level Map — pola identik dengan lib/config-registry.ts.
//   - Warm instance: 0ms (tidak query DB)
//   - Cold start: 1 DB query → simpan ke Map, dibagi semua layout di instance yang sama
//   - Update brand: panggil invalidateBrandCache() → Map di-clear
//
// PENTING:
//   File ini HANYA berisi data yang truly shared antar role.
//   Data spesifik per role (featureKeys SA, status vendor) tetap di layout masing-masing.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Konstanta ────────────────────────────────────────────────────────────────

const BRAND_CACHE_TTL_MS = 30 * 60 * 1000 // 30 menit
const BRAND_CACHE_KEY    = 'platform-brand-name'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

interface BrandCacheEntry {
  nama_brand: string
  expiredAt:  number
}

// ─── Module-level Cache ───────────────────────────────────────────────────────
// Hidup selama serverless instance masih warm.
// Satu instance melayani semua layout (SA, Vendor, dst) — cache ini shared.

const brandCache = new Map<string, BrandCacheEntry>()

// ─── FUNGSI 1: getBrandName ───────────────────────────────────────────────────

/**
 * Ambil nama brand platform dari tabel tenants.
 * Di-cache di module-level Map selama 30 menit — shared antar semua dashboard layout.
 *
 * Dipakai oleh:
 *   - app/dashboard/superadmin/layout.tsx
 *   - app/dashboard/vendor/layout.tsx
 *   - app/dashboard/admin-tenant/layout.tsx (saat dibuat)
 *
 * TIDAK perlu dipanggil berkali-kali per request — instance yang sama
 * berbagi cache yang sama untuk semua layout yang mengimpor fungsi ini.
 *
 * @param fallback - nilai default jika DB tidak tersedia (default: 'ERP Mediator')
 */
export async function getBrandName(fallback = 'ERP Mediator'): Promise<string> {
  const now    = Date.now()
  const cached = brandCache.get(BRAND_CACHE_KEY)

  // Cache hit — return langsung tanpa query DB
  if (cached && now < cached.expiredAt) return cached.nama_brand

  // Cache miss / expired — query DB
  try {
    const db = createServerSupabaseClient()
    const { data } = await db
      .from('tenants')
      .select('nama_brand')
      .limit(1)
      .single()

    const nama_brand = data?.nama_brand ?? fallback

    // Simpan ke cache — semua layout berikutnya di instance ini dapat 0ms
    brandCache.set(BRAND_CACHE_KEY, {
      nama_brand,
      expiredAt: now + BRAND_CACHE_TTL_MS,
    })

    return nama_brand
  } catch {
    // Kembalikan cache lama jika ada (stale-while-error) atau fallback
    return cached?.nama_brand ?? fallback
  }
}

// ─── FUNGSI 2: invalidateBrandCache ──────────────────────────────────────────

/**
 * Hapus cache brand name.
 * Wajib dipanggil saat SuperAdmin update nama brand via dashboard.
 * Tanpa parameter → invalidate semua (saat ini hanya 1 key).
 */
export function invalidateBrandCache(): void {
  brandCache.clear()
}
