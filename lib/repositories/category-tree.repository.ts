// lib/repositories/category-tree.repository.ts
// Repository untuk tabel categories — fungsi tree untuk Dialog Assign Kategori.
// TIDAK ada logika bisnis — hanya query dan return data.
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.3
//
// Dipecah dari category.repository.ts (ATURAN 9 — 10 KB)
// File ini    : buildTreeForAssignDialog (join assignment + nama tenant)
// category.repository.ts : CRUD dasar + stats

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  Category,
  CategoryDenganSub,
  CategoryTreeNode,
  CategoryTreeNodeStatus,
} from '@/lib/types/category.types'

// ─── findAllDenganSub (untuk tree view sederhana) ────────────────────────────
/**
 * Ambil semua root kategori aktif beserta sub-kategorinya.
 * Dipakai untuk dropdown dan tree view yang tidak butuh status assignment.
 */
export async function findAllDenganSub(): Promise<CategoryDenganSub[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error || !data) return []

  const all   = data as Category[]
  const roots = all.filter(c => c.level === 1)
  const subs  = all.filter(c => c.level === 2)

  return roots.map(root => ({
    ...root,
    sub_categories:    subs.filter(s => s.parent_id === root.id),
    total_assignments: 0,   // diisi oleh service jika perlu
  })) as CategoryDenganSub[]
}

// ─── buildTreeForAssignDialog (untuk panel kiri Dialog Assign Kategori) ───────
/**
 * Bangun tree kategori untuk Dialog Assign dengan status per node.
 * Status per node: dipegang_tenant_ini / dipegang_tenant_lain / tersedia.
 *
 * @param tenantId - UUID tenant yang sedang dibuka di Detail Tenant
 */
export async function buildTreeForAssignDialog(
  tenantId: string
): Promise<CategoryTreeNode[]> {
  const db = createServerSupabaseClient()

  // Ambil semua kategori aktif
  const { data: allCats } = await db
    .from('categories')
    .select('id, slug, display_name, icon_name, icon_bg, level, parent_id, is_active')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!allCats) return []

  // Ambil semua assignment aktif + nama tenant yang pegang
  const { data: allAssignments } = await db
    .from('tenant_category_assignments')
    .select('category_id, tenant_id, id, tenants(nama_brand)')
    .eq('status', 'active')
    .is('deleted_at', null)

  // Map category_id → { tenantId, tenantName, assignmentId }
  type AssignInfo = { tenantId: string; tenantName: string; assignmentId: string }
  const assignMap = new Map<string, AssignInfo>()
  for (const a of allAssignments ?? []) {
    assignMap.set(a.category_id, {
      tenantId:     a.tenant_id,
      tenantName:   (a.tenants as unknown as { nama_brand: string } | null)?.nama_brand ?? 'Tenant lain',
      assignmentId: a.id,
    })
  }

  // Helper: tentukan status per node
  const getStatus = (catId: string): CategoryTreeNodeStatus => {
    const info = assignMap.get(catId)
    if (!info) return 'tersedia'
    if (info.tenantId === tenantId) return 'dipegang_tenant_ini'
    return 'dipegang_tenant_lain'
  }

  const roots = allCats.filter(c => c.level === 1)
  const subs  = allCats.filter(c => c.level === 2)

  return roots.map((root): CategoryTreeNode => {
    const rootStatus = getStatus(root.id)
    const assignInfo = assignMap.get(root.id)

    return {
      id:              root.id,
      slug:            root.slug,
      display_name:    root.display_name,
      icon_name:       root.icon_name ?? null,
      icon_bg:         root.icon_bg ?? null,
      level:           1 as const,
      parent_id:       null,
      is_active:       root.is_active,
      status:          rootStatus,
      tenant_pemegang: rootStatus === 'dipegang_tenant_lain'
                         ? (assignInfo?.tenantName ?? null)
                         : null,
      assignment_id:   assignInfo?.assignmentId ?? null,
      sub_nodes:       subs
        .filter(s => s.parent_id === root.id)
        .map((sub): CategoryTreeNode => {
          const subStatus = getStatus(sub.id)
          const subAssign = assignMap.get(sub.id)
          return {
            id:              sub.id,
            slug:            sub.slug,
            display_name:    sub.display_name,
            icon_name:       sub.icon_name ?? null,
            icon_bg:         sub.icon_bg ?? null,
            level:           2 as const,
            parent_id:       sub.parent_id,
            is_active:       sub.is_active,
            status:          subStatus,
            tenant_pemegang: subStatus === 'dipegang_tenant_lain'
                               ? (subAssign?.tenantName ?? null)
                               : null,
            assignment_id:   subAssign?.assignmentId ?? null,
            sub_nodes:       [],
          }
        }),
    }
  })
}
