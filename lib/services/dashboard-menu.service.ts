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
import {
  DashboardMenuRepo_getByRoleScope,
  DashboardMenuRepo_getCeilingsByTenant,
  DashboardMenuRepo_getMenuAccessByMembership,
  DashboardMenuRepo_getAssignmentAccessByMembership,
} from '@/lib/repositories/dashboard-menu.repository'
import type {
  DashboardMenuRow,
  MenuGroup,
  MenuItem,
  AtAccessContext,
} from '@/lib/types/dashboard-menu.types'

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
 * FASE 2 AT: jika roleScope='admin_tenant' DAN atContext diisi:
 *   - PJ (jabatan='penanggung_jawab'): semua menu ceiling tenant yang aktif
 *   - Non-PJ: ceiling ∩ membership_menu_access (eksplisit-grant, K-36) ∩ filter is_pj_only=FALSE
 * Jika atContext tidak diisi (fallback FASE 1): kembalikan semua menu role_scope aktif.
 *
 * @param roleScope  - kode role dashboard: super_admin | admin_tenant | vendor | customer
 * @param atContext  - (opsional) konteks AT untuk FASE 2 resolver
 */
export const getEffectiveMenu = cache(
  async (roleScope: string, atContext?: AtAccessContext): Promise<MenuGroup[]> => {
    // SA path: tidak butuh ceiling/grant — semua menu SA ditampilkan
    if (roleScope !== 'admin_tenant' || !atContext) {
      return getMenuCached(roleScope)()
    }

    // AT path FASE 2: resolver dengan ceiling + grant
    return AtAksesService_resolveMenusForMembership(atContext)
  }
)

// ─── FASE 2: AtAksesService_resolveMenusForMembership ──────────────────────────
/**
 * Resolver akses menu efektif untuk satu AT berdasarkan jabatan + ceiling + grant.
 *
 * Aturan resolusi (K-33, K-36, Pilihan A):
 *   PJ (jabatan='penanggung_jawab') → SEMUA menu ceiling tenant (is_pj_only boleh)
 *   Non-PJ → ceiling ∩ membership_menu_access ∩ (is_pj_only = FALSE)
 *
 * Shared function — dipakai login flow + dashboard render AT.
 * Cache PER membership: tag 'dashboard-menus:at:{tenantId}:{membershipId}'
 * Invalidasi via revalidateTag saat SA/PJ ubah ceiling atau grant.
 *
 * @param ctx - tenantId, membershipId, jabatan
 */
export async function AtAksesService_resolveMenusForMembership(
  ctx: AtAccessContext
): Promise<MenuGroup[]> {
  const { tenantId, membershipId, jabatan } = ctx

  // 1. Ambil semua menu AT dari katalog (flat)
  const allAtMenus = await DashboardMenuRepo_getByRoleScope('admin_tenant')
  if (!allAtMenus.length) return []

  // 2. Ambil ceiling tenant
  const ceilings = await DashboardMenuRepo_getCeilingsByTenant(tenantId)
  const ceilingSet = new Set(ceilings.map(c => c.menuId))

  // 3. Filter berdasarkan jabatan
  let allowedMenuIds: Set<string>

  if (jabatan === 'penanggung_jawab') {
    // PJ: semua menu dalam ceiling (termasuk is_pj_only)
    allowedMenuIds = ceilingSet
  } else {
    // Non-PJ: irisan ceiling ∩ grant eksplisit ∩ bukan is_pj_only
    const grants = await DashboardMenuRepo_getMenuAccessByMembership(membershipId)
    const grantSet = new Set(grants.map(g => g.menuId))

    allowedMenuIds = new Set(
      [...ceilingSet].filter(id => grantSet.has(id))
    )
  }

  // 4. Filter menu rows: hanya yang ada di allowedMenuIds + bukan is_pj_only untuk non-PJ
  const filteredRows = allAtMenus.filter(row => {
    // Grup/menu induk: tampilkan jika id-nya di allowed, ATAU punya child yang allowed
    // SubMenu: tampilkan jika id-nya di allowed
    // is_pj_only: non-PJ tidak boleh lihat
    if (jabatan !== 'penanggung_jawab' && row.is_pj_only) return false
    return allowedMenuIds.has(row.id)
  })

  // Sertakan juga grup induk yang punya minimal satu submenu yang allowed
  const allowedParentIds = new Set(filteredRows.map(r => r.parent_id).filter(Boolean))
  const finalRows = allAtMenus.filter(row => {
    if (jabatan !== 'penanggung_jawab' && row.is_pj_only) return false
    // Grup induk: tampilkan jika punya anak yang allowed
    if (row.parent_id === null) return allowedParentIds.has(row.id) || allowedMenuIds.has(row.id)
    // Submenu: hanya jika di allowed
    return allowedMenuIds.has(row.id)
  })

  return bangunHierarki(finalRows)
}

// ─── FASE 2: AtAksesService_resolveAssignmentsForMembership ───────────────────
/**
 * Resolver akses Area+Kategori (Dimensi 1) untuk satu AT.
 *
 * PJ → return null (semua assignment tenant; caller query tenant_category_assignments langsung)
 * Non-PJ → return Set<assignmentId> dari membership_assignment_access
 *
 * Shared function. Dipakai dashboard render + filter data order/laporan AT.
 *
 * @param ctx - tenantId, membershipId, jabatan
 * @returns Set<string> assignment IDs yang boleh diakses, atau null jika PJ (= akses semua)
 */
export async function AtAksesService_resolveAssignmentsForMembership(
  ctx: AtAccessContext
): Promise<Set<string> | null> {
  const { membershipId, jabatan } = ctx

  // PJ: akses semua assignment — caller filter sendiri berdasarkan tenant_id
  if (jabatan === 'penanggung_jawab') return null

  // Non-PJ: hanya assignment yang di-grant
  const rows = await DashboardMenuRepo_getAssignmentAccessByMembership(membershipId)
  return new Set(rows.map(r => r.tenantCategoryAssignmentId))
}
