// lib/constants/menu-route.constant.ts
// SSOT penurunan href item menu SuperAdmin (data-driven + fallback statis).
// Menyatukan duplikasi lama: navItemToPath (nav.constant.ts) + resolveHref lokal (SidebarNav.tsx).
// Dipakai oleh: components/SidebarNav.tsx (render sidebar), lib/constants/nav.constant.ts
//               (fallback SA_NAV_GROUPS), lib/guards/menu-catalog.guard.test.ts (guard 2-arah).
//
// Dibuat: Sesi #409 — L4 HUTANG-MENU-VISIBILITAS-GOVERNANCE.
// Acuan: SPEC_TABEL_MENU_KATALOG Bagian 8 (feature_flag = sumber turunan href, BUKAN gate visibilitas).
// Anti-duplikasi logic href (ATURAN 19): satu-satunya tempat menurunkan href menu SA.

/** Basis route halaman konfigurasi SA. Item feature_flag menurunkan href ke sub-path di sini. */
export const SA_SETTINGS_BASE = '/dashboard/superadmin/settings'

/** Landing dashboard SA — href default untuk item grup/header (tanpa route_path & feature_flag). */
export const SA_DASHBOARD_ROOT = '/dashboard/superadmin'

/**
 * Turunkan href sebuah item menu SA dari (route_path, feature_flag).
 * Prioritas:
 *   1. route_path terisi   -> pakai apa adanya (kontrak eksplisit).
 *   2. feature_flag terisi -> `${SA_SETTINGS_BASE}/{feature_flag: _->-}`
 *      (halaman nyata ATAU catch-all placeholder settings/[...slug] — ATURAN 49 / SPEC Bagian 8.3).
 *   3. keduanya kosong     -> SA_DASHBOARD_ROOT (item grup/header, tak punya halaman).
 *
 * Perilaku identik dengan dua fungsi lama yang digantikannya:
 *   navItemToPath(item)          === resolveMenuHref(item.path, item.key)
 *   resolveHref(routePath, flag) === resolveMenuHref(routePath, flag)
 */
export function resolveMenuHref(
  routePath?: string | null,
  featureFlag?: string | null,
): string {
  if (routePath)   return routePath
  if (featureFlag) return `${SA_SETTINGS_BASE}/${featureFlag.replace(/_/g, '-')}`
  return SA_DASHBOARD_ROOT
}
