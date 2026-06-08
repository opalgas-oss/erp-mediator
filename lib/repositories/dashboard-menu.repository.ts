// lib/repositories/dashboard-menu.repository.ts
// Repository untuk katalog menu data-driven (tabel dashboard_menus).
// Dibuat: Sesi #254 — FASE 1 HUTANG-NAV-DATADRIVEN (K-40).
//
// Layer Repository (3-layer: Route → Service → Repository). HANYA query DB di sini.
// Membangun hierarki + caching ada di Service (dashboard-menu.service.ts).

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  DashboardMenuRow,
  CeilingRow,
  MembershipMenuAccessRow,
  MembershipAssignmentAccessRow,
} from '@/lib/types/dashboard-menu.types'

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

// ─── FASE 2: Ceiling menu per tenant ──────────────────────────────────────────
/**
 * Ambil daftar menu_id ceiling aktif untuk satu tenant.
 * Dipakai resolver AT: PJ mendapat seluruh ceiling ini; non-PJ mendapat irisan.
 */
export async function DashboardMenuRepo_getCeilingsByTenant(
  tenantId: string
): Promise<CeilingRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('tenant_menu_ceilings')
    .select('menu_id, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (error) throw new Error(`DashboardMenuRepo_getCeilingsByTenant(${tenantId}): ${error.message}`)
  return (data ?? []).map(r => ({ menuId: r.menu_id, isActive: r.is_active }))
}

// ─── FASE 2: Grant menu per-individu non-PJ ──────────────────────────────────
/**
 * Ambil daftar menu_id yang di-grant eksplisit ke membership non-PJ.
 * PJ tidak punya baris di tabel ini — resolusi otomatis penuh di service.
 */
export async function DashboardMenuRepo_getMenuAccessByMembership(
  membershipId: string
): Promise<MembershipMenuAccessRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('membership_menu_access')
    .select('menu_id, is_active')
    .eq('user_membership_id', membershipId)
    .eq('is_active', true)

  if (error) throw new Error(`DashboardMenuRepo_getMenuAccessByMembership(${membershipId}): ${error.message}`)
  return (data ?? []).map(r => ({ menuId: r.menu_id, isActive: r.is_active }))
}

// ─── FASE 2: Grant assignment (Area+Kategori) per-individu non-PJ ──────────────
/**
 * Ambil daftar tenant_category_assignment_id yang boleh diakses membership non-PJ.
 * PJ tidak punya baris — akses semua assignment tenant (resolusi di service).
 */
export async function DashboardMenuRepo_getAssignmentAccessByMembership(
  membershipId: string
): Promise<MembershipAssignmentAccessRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('membership_assignment_access')
    .select('tenant_category_assignment_id, is_active')
    .eq('user_membership_id', membershipId)
    .eq('is_active', true)

  if (error) throw new Error(`DashboardMenuRepo_getAssignmentAccessByMembership(${membershipId}): ${error.message}`)
  return (data ?? []).map(r => ({
    tenantCategoryAssignmentId: r.tenant_category_assignment_id,
    isActive: r.is_active,
  }))
}
