// lib/repositories/dashboard-menu.repository.ts
// Repository untuk katalog menu data-driven (tabel dashboard_menus).
// Dibuat: Sesi #254 — FASE 1 HUTANG-NAV-DATADRIVEN (K-40).
//
// Layer Repository (3-layer: Route → Service → Repository). HANYA query DB di sini.
// Membangun hierarki + caching ada di Service (dashboard-menu.service.ts).

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { DashboardMenuRow } from '@/lib/types/dashboard-menu.types'

// ─── Ambil semua menu aktif untuk satu dashboard (role_scope) ─────────────────
/**
 * Ambil baris menu mentah (flat) untuk satu role_scope, terurut siap-render.
 * Filter: is_active = true + belum di-soft-delete. Urut: parent_id (NULLS FIRST) lalu sort_order.
 * Hierarki induk-anak dibangun di Service, bukan di sini.
 */
export async function DashboardMenuRepo_getByRoleScope(
  roleScope: string
): Promise<DashboardMenuRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('dashboard_menus')
    .select('id, parent_id, role_scope, menu_key, label_key, route_path, icon_key, sort_order, is_pj_only, feature_flag, is_active')
    .eq('role_scope', roleScope)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`DashboardMenuRepo_getByRoleScope(${roleScope}): ${error.message}`)
  return data ?? []
}
