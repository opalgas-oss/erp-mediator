// lib/repositories/category.repository.ts
// Repository untuk tabel categories — CRUD + list + stats.
// TIDAK ada logika bisnis — hanya query dan return data.
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.3
//
// Dipecah per ATURAN 9 (10 KB):
// File ini    : CRUD dasar + findAll + stats
// category-tree.repository.ts : buildTreeForAssignDialog (join kompleks untuk dialog assign)

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  Category,
  CategoryListItem,
  CategoryListFilter,
  CategoryStats,
  BuatRootCategoryPayload,
  BuatSubCategoryPayload,
  UpdateCategoryPayload,
} from '@/lib/types/category.types'

// ─── findAll ─────────────────────────────────────────────────────────────────
/**
 * Ambil semua kategori (tidak soft-deleted), urut sort_order.
 * Dipakai untuk build tree + list page.
 */
export async function findAll(): Promise<Category[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('display_name', { ascending: true })

  if (error || !data) return []
  return data as Category[]
}

// ─── findById ────────────────────────────────────────────────────────────────
export async function findById(id: string): Promise<Category | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as Category
}

// ─── findBySlug ──────────────────────────────────────────────────────────────
export async function findBySlug(slug: string): Promise<Category | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as Category
}

// ─── findListItemsWithStats (untuk halaman List Categories) ──────────────────
/**
 * Ambil list kategori dengan aggregasi tenant yang memegang.
 */
export async function findListItemsWithStats(
  filter: CategoryListFilter
): Promise<{ data: CategoryListItem[]; total: number }> {
  const db = createServerSupabaseClient()

  let query = db
    .from('categories')
    .select(`
      id, slug, display_name, icon_name, icon_bg,
      sort_order, parent_id, level, is_active, created_at
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (filter.level !== undefined)     query = query.eq('level', filter.level)
  if (filter.is_active !== undefined) query = query.eq('is_active', filter.is_active)
  if (filter.search) {
    query = query.or(`display_name.ilike.%${filter.search}%,slug.ilike.%${filter.search}%`)
  }

  const page  = filter.page  ?? 1
  const limit = filter.limit ?? 50
  query = query.range((page - 1) * limit, page * limit - 1)

  const { data, count, error } = await query
  if (error || !data) return { data: [], total: 0 }

  // Ambil assignment counts secara terpisah
  const ids = (data as Category[]).map(c => c.id)
  const { data: assigns } = await db
    .from('tenant_category_assignments')
    .select('category_id, tenants(nama_brand)')
    .in('category_id', ids)
    .eq('status', 'active')
    .is('deleted_at', null)

  type AssignRow = { category_id: string; tenants: { nama_brand: string } | null }
  const assignsByCategory = new Map<string, string[]>()
  for (const a of (assigns ?? []) as unknown as AssignRow[]) {
    if (!assignsByCategory.has(a.category_id)) {
      assignsByCategory.set(a.category_id, [])
    }
    if (a.tenants?.nama_brand) {
      assignsByCategory.get(a.category_id)!.push(a.tenants.nama_brand)
    }
  }

  const items: CategoryListItem[] = (data as Category[]).map(c => ({
    id:            c.id,
    slug:          c.slug,
    display_name:  c.display_name,
    icon_name:     c.icon_name,
    icon_bg:       c.icon_bg,
    sort_order:    c.sort_order,
    parent_id:     c.parent_id,
    level:         c.level,
    is_active:     c.is_active,
    created_at:    c.created_at,
    total_tenants: assignsByCategory.get(c.id)?.length ?? 0,
    total_vendors: 0,
    tenant_names:  (assignsByCategory.get(c.id) ?? []).slice(0, 3),
  }))

  return { data: items, total: count ?? 0 }
}

// ─── getStats (untuk 4 kartu halaman List Categories) ────────────────────────
export async function getStats(): Promise<CategoryStats> {
  const db = createServerSupabaseClient()

  const [allCats, assignedIds] = await Promise.all([
    db.from('categories').select('id, level').is('deleted_at', null),
    db.from('tenant_category_assignments')
      .select('category_id')
      .eq('status', 'active')
      .is('deleted_at', null),
  ])

  const cats        = allCats.data ?? []
  const assignedSet = new Set((assignedIds.data ?? []).map(a => a.category_id))

  return {
    total_root:       cats.filter(c => c.level === 1).length,
    total_sub:        cats.filter(c => c.level === 2).length,
    total_assigned:   cats.filter(c => assignedSet.has(c.id)).length,
    total_unassigned: cats.filter(c => !assignedSet.has(c.id)).length,
  }
}

// ─── insertRoot ──────────────────────────────────────────────────────────────
export async function insertRoot(
  payload:   BuatRootCategoryPayload,
  createdBy: string
): Promise<Category | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('categories')
    .insert({ ...payload, level: 1, parent_id: null, created_by: createdBy, updated_by: createdBy })
    .select()
    .single()

  if (error || !data) return null
  return data as Category
}

// ─── insertSub ───────────────────────────────────────────────────────────────
export async function insertSub(
  payload:   BuatSubCategoryPayload,
  createdBy: string
): Promise<Category | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('categories')
    .insert({ ...payload, level: 2, created_by: createdBy, updated_by: createdBy })
    .select()
    .single()

  if (error || !data) return null
  return data as Category
}

// ─── update ──────────────────────────────────────────────────────────────────
export async function update(
  id:        string,
  payload:   UpdateCategoryPayload,
  updatedBy: string
): Promise<Category | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('categories')
    .update({ ...payload, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error || !data) return null
  return data as Category
}

// ─── softDelete ──────────────────────────────────────────────────────────────
/**
 * Soft delete kategori. Jika cascade = true, hapus sub-kategori juga.
 * Validasi tidak ada assignment aktif WAJIB dilakukan di service layer sebelum memanggil ini.
 */
export async function softDelete(
  id:        string,
  deletedBy: string,
  cascade    = false
): Promise<boolean> {
  const db  = createServerSupabaseClient()
  const now = new Date().toISOString()

  if (cascade) {
    await db
      .from('categories')
      .update({ deleted_at: now, deleted_by: deletedBy })
      .eq('parent_id', id)
      .is('deleted_at', null)
  }

  const { error } = await db
    .from('categories')
    .update({ deleted_at: now, deleted_by: deletedBy })
    .eq('id', id)
    .is('deleted_at', null)

  return !error
}

// ─── cekSlugUnique ───────────────────────────────────────────────────────────
/**
 * Cek apakah slug sudah dipakai.
 * @returns true jika BELUM dipakai (slug aman digunakan)
 */
export async function cekSlugUnique(slug: string, excludeId?: string): Promise<boolean> {
  const db = createServerSupabaseClient()
  let query = db
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)

  if (excludeId) query = query.neq('id', excludeId)

  const { data } = await query.maybeSingle()
  return !data
}
