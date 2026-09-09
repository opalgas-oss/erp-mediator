// lib/config-sidebar.ts
// Pembaca `config_registry` untuk SIDEBAR dashboard SuperAdmin.
// Lahir S#498 dari pemecahan `lib/config-registry.ts`.
// Sumbu: pemakainya SATU — `app/dashboard/superadmin/layout.tsx`. Ia berubah ketika susunan
//   menu SA berubah, ⛔ bukan ketika pembacaan nilai setelan aplikasi berubah. TTL-nya pun
//   berbeda (1800s, tag 'sidebar-data') dari pembaca nilai (300s, tag 'config').
// ⛔ Isi di bawah dipindah MEKANIS oleh program — nol karakter diketik ulang.

import 'server-only'
import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── FUNGSI: getActiveSidebarFeatureKeys ──────────────────────────────────────
/**
 * Ambil daftar feature_key aktif dari config_registry untuk sidebar SA.
 * Di-cache via Vercel Data Cache (unstable_cache) TTL 1800 detik, tag 'sidebar-data'.
 * Cache ini survive cold restart lambda — tidak hit DB setiap cold start.
 * Invalidasi otomatis saat revalidateTag('sidebar-data') dipanggil di PATCH /api/config.
 *
 * FIX Sesi #146 — BUG-015 Tahap 2 Iterasi 2 (Fix A):
 *   Menggantikan raw Supabase query di fetchSidebarData() di layout SA.
 *   Raw query sebelumnya hit DB setiap request (warm maupun cold) tanpa cache.
 */
export const getActiveSidebarFeatureKeys = unstable_cache(
  async (): Promise<string[]> => {
    try {
      const db = createServerSupabaseClient()
      const { data } = await db
        .from('config_registry')
        .select('feature_key')
        .is('tenant_id', null)
        .eq('is_active', true)
      const keys = [...new Set((data ?? []).map((r: { feature_key: string }) => r.feature_key))]
      return keys.length > 0 ? keys : ['security_login']
    } catch {
      return ['security_login']
    }
  },
  ['sidebar-feature-keys'],
  { tags: ['sidebar-data'], revalidate: 1800 }
)

