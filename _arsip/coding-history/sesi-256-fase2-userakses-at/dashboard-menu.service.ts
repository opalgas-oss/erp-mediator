// lib/services/dashboard-menu.service.ts
// Service katalog menu data-driven — bangun hierarki grup→item + caching.
// Dibuat: Sesi #254 — FASE 1 HUTANG-NAV-DATADRIVEN (K-40).
//
// Layer Service (3-layer: Route → Service → Repository).
// Mengubah baris flat dari repository menjadi struktur grup→item siap-render.
//
// CACHING (pola identik getActiveSidebarFeatureKeys di lib/config-registry.ts):
//   Lapisan 1: React cache() — deduplikasi dalam 1 render tree (per-request).
//   Lapisan 2: unstable_cache — Vercel Data Cache, TTL 1800s, tag per role_scope.
//   Survive cold restart. Invalidasi via revalidateTag('dashboard-menus:{roleScope}')
//   saat SuperAdmin mengubah katalog (FASE selanjutnya — halaman Kelola Menu).

import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { DashboardMenuRepo_getByRoleScope } from '@/lib/repositories/dashboard-menu.repository'
import type { DashboardMenuRow, MenuGroup, MenuItem } from '@/lib/types/dashboard-menu.types'

// ─── Bangun hierarki grup→item dari baris flat ────────────────────────────────
/**
 * Ubah daftar baris flat (parent + child campur) menjadi grup induk berisi item anak.
 * Hanya grup level-1 (parent_id NULL) yang jadi MenuGroup; anaknya jadi MenuItem.
 * Urutan grup dan item mengikuti sort_order dari query (sudah terurut).
 */
function bangunHierarki(rows: DashboardMenuRow[]): MenuGroup[] {
  const grupInduk = rows.filter(r => r.parent_id === null)
  const anak       = rows.filter(r => r.parent_id !== null)

  return grupInduk.map(grup => {
    const items: MenuItem[] = anak
      .filter(a => a.parent_id === grup.id)
      .map(a => ({
        menuKey:     a.menu_key,
        labelKey:    a.label_key,
        routePath:   a.route_path,
        featureFlag: a.feature_flag,
        isPjOnly:    a.is_pj_only,
      }))

    return {
      menuKey:  grup.menu_key,
      labelKey: grup.label_key,
      iconKey:  grup.icon_key,
      items,
    }
  })
}

// ─── getEffectiveMenu — fungsi internal ber-cache per role_scope ──────────────
//
// Catatan: unstable_cache tidak bisa menerima argumen dinamis di key tag secara
// langsung pada definisi const, sehingga dibungkus factory per pemanggilan dengan
// key + tag yang mengandung roleScope. Pola ini menjaga cache terpisah per role.
function getMenuCached(roleScope: string) {
  return unstable_cache(
    async (): Promise<MenuGroup[]> => {
      try {
        const rows = await DashboardMenuRepo_getByRoleScope(roleScope)
        return bangunHierarki(rows)
      } catch (err) {
        console.error(`[dashboard-menu] getEffectiveMenu(${roleScope}):`, err)
        return []
      }
    },
    [`dashboard-menus-${roleScope}`],
    { tags: [`dashboard-menus:${roleScope}`], revalidate: 1800 }
  )
}

// ─── FUNGSI PUBLIK: getEffectiveMenu ──────────────────────────────────────────
/**
 * Ambil struktur menu efektif (grup→item) untuk satu dashboard berdasarkan role_scope.
 * Sumber: tabel dashboard_menus (data-driven, K-40). Menggantikan SA_NAV_GROUPS hardcode.
 *
 * Catatan FASE 1: belum memfilter akses per-individu/tenant (itu FASE 2).
 * Untuk SA, semua menu role_scope='super_admin' yang aktif dikembalikan.
 *
 * @param roleScope - kode role pemilik dashboard: super_admin | admin_tenant | vendor | customer
 */
export const getEffectiveMenu = cache(
  async (roleScope: string): Promise<MenuGroup[]> => {
    return getMenuCached(roleScope)()
  }
)
