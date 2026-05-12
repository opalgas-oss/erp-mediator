// lib/services/category.service.ts
// Service layer untuk entitas categories — business logic + validation.
// Dipakai oleh: API route handlers di app/api/superadmin/categories/
//
// ARSITEKTUR:
//   API Route → CategoryService_* → categoryRepo_* / categoryTreeRepo_* → DB
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.4

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  findById,
  findListItemsWithStats,
  getStats,
  insertRoot,
  insertSub,
  update,
  softDelete,
  cekSlugUnique,
} from '@/lib/repositories/category.repository'
import {
  findAllDenganSub,
  buildTreeForAssignDialog,
} from '@/lib/repositories/category-tree.repository'
import type {
  Category,
  CategoryDenganSub,
  CategoryTreeNode,
  CategoryListFilter,
  BuatRootCategoryPayload,
  BuatSubCategoryPayload,
  UpdateCategoryPayload,
  CategoryListResponse,
} from '@/lib/types/category.types'

// ─── Validation Helpers ──────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z][a-z0-9-]*$/

function validateSlugKategori(slug: string): void {
  if (!slug || slug.length < 2 || slug.length > 80) {
    throw new Error('Slug kategori harus 2–80 karakter')
  }
  // Cek slug tanpa prefix root (untuk sub: 'root/sub')
  const parts = slug.split('/')
  for (const part of parts) {
    if (!SLUG_REGEX.test(part)) {
      throw new Error(
        'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-), mulai dari huruf'
      )
    }
  }
}

function validateDisplayName(name: string): void {
  if (!name?.trim()) throw new Error('Nama kategori wajib diisi')
  if (name.trim().length > 100) throw new Error('Nama kategori maksimal 100 karakter')
}

// ─── CategoryService_list ─────────────────────────────────────────────────────
/**
 * Ambil list kategori dengan stats assignment (untuk halaman List Categories).
 */
export async function CategoryService_list(
  filter: CategoryListFilter
): Promise<CategoryListResponse> {
  const [result, stats] = await Promise.all([
    findListItemsWithStats(filter),
    getStats(),
  ])

  return {
    data:  result.data,
    stats,
    total: result.total,
    page:  filter.page  ?? 1,
    limit: filter.limit ?? 50,
  }
}

// ─── CategoryService_getById ──────────────────────────────────────────────────
export async function CategoryService_getById(
  id: string
): Promise<Category | null> {
  if (!id) throw new Error('ID kategori wajib diisi')
  return findById(id)
}

// ─── CategoryService_getAllDenganSub ──────────────────────────────────────────
/**
 * Ambil semua kategori aktif beserta sub-nya (untuk dropdown dan tree sederhana).
 */
export async function CategoryService_getAllDenganSub(): Promise<CategoryDenganSub[]> {
  return findAllDenganSub()
}

// ─── CategoryService_getTreeForAssign ────────────────────────────────────────
/**
 * Bangun tree dengan status per node untuk Dialog Assign Kategori.
 */
export async function CategoryService_getTreeForAssign(
  tenantId: string
): Promise<CategoryTreeNode[]> {
  if (!tenantId) throw new Error('ID tenant wajib diisi')
  return buildTreeForAssignDialog(tenantId)
}

// ─── CategoryService_buatRoot ─────────────────────────────────────────────────
/**
 * Buat root kategori baru.
 */
export async function CategoryService_buatRoot(
  payload:   BuatRootCategoryPayload,
  createdBy: string
): Promise<Category> {
  validateDisplayName(payload.display_name)
  validateSlugKategori(payload.slug)

  // Slug tidak boleh mengandung '/' (hanya untuk sub)
  if (payload.slug.includes('/')) {
    throw new Error('Slug root kategori tidak boleh mengandung "/". Gunakan format: "nama-kategori"')
  }

  const unik = await cekSlugUnique(payload.slug)
  if (!unik) {
    throw new Error(`Slug "${payload.slug}" sudah digunakan oleh kategori lain`)
  }

  const result = await insertRoot(payload, createdBy)
  if (!result) throw new Error('Gagal membuat kategori root')
  return result
}

// ─── CategoryService_buatSub ──────────────────────────────────────────────────
/**
 * Buat sub-kategori baru di bawah root tertentu.
 */
export async function CategoryService_buatSub(
  payload:   BuatSubCategoryPayload,
  createdBy: string
): Promise<Category> {
  validateDisplayName(payload.display_name)
  validateSlugKategori(payload.slug)

  // Pastikan parent ada dan merupakan root
  const parent = await findById(payload.parent_id)
  if (!parent) throw new Error('Kategori induk tidak ditemukan')
  if (parent.level !== 1) throw new Error('Kategori induk harus root (level 1)')

  // Slug sub harus berformat: [root-slug]/[sub-slug]
  const expectedPrefix = parent.slug + '/'
  if (!payload.slug.startsWith(expectedPrefix)) {
    throw new Error(
      `Slug sub-kategori harus diawali "${expectedPrefix}". Contoh: "${parent.slug}/nama-sub"`
    )
  }

  const unik = await cekSlugUnique(payload.slug)
  if (!unik) {
    throw new Error(`Slug "${payload.slug}" sudah digunakan`)
  }

  const result = await insertSub(payload, createdBy)
  if (!result) throw new Error('Gagal membuat sub-kategori')
  return result
}

// ─── CategoryService_update ───────────────────────────────────────────────────
/**
 * Update field kategori. Slug immutable jika sudah ada assignment aktif.
 */
export async function CategoryService_update(
  id:        string,
  payload:   UpdateCategoryPayload,
  updatedBy: string
): Promise<Category> {
  if (payload.display_name) validateDisplayName(payload.display_name)

  if (payload.slug) {
    // Slug immutable jika sudah ada assignment — validasi di repository level
    validateSlugKategori(payload.slug)
    const unik = await cekSlugUnique(payload.slug, id)
    if (!unik) throw new Error(`Slug "${payload.slug}" sudah digunakan kategori lain`)
  }

  const result = await update(id, payload, updatedBy)
  if (!result) throw new Error('Gagal mengupdate kategori. Pastikan kategori masih aktif.')
  return result
}

// ─── CategoryService_hapus ────────────────────────────────────────────────────
/**
 * Hapus kategori (soft delete). Hanya jika tidak ada assignment aktif.
 * Jika kategori root, cascade hapus sub-kategorinya.
 */
export async function CategoryService_hapus(
  id:        string,
  deletedBy: string
): Promise<void> {
  const kategori = await findById(id)
  if (!kategori) throw new Error('Kategori tidak ditemukan')

  // Cek assignment aktif
  const db = createServerSupabaseClient()
  const { count } = await db
    .from('tenant_category_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .in('status', ['active', 'suspended', 'pending_handover'])
    .is('deleted_at', null)

  if ((count ?? 0) > 0) {
    throw new Error(
      'Kategori tidak bisa dihapus karena masih dipegang tenant aktif. ' +
      'Cabut semua penugasan terlebih dahulu.'
    )
  }

  const isRoot  = kategori.level === 1
  const ok      = await softDelete(id, deletedBy, isRoot)
  if (!ok) throw new Error('Gagal menghapus kategori')
}

// ─── CategoryService_cekSlug ──────────────────────────────────────────────────
/**
 * Cek ketersediaan slug kategori (untuk validasi realtime di form).
 */
export async function CategoryService_cekSlug(
  slug:      string,
  excludeId?: string
): Promise<{ tersedia: boolean }> {
  try { validateSlugKategori(slug) }
  catch { return { tersedia: false } }

  const unik = await cekSlugUnique(slug, excludeId)
  return { tersedia: unik }
}

// ─── CategoryService_generateSlug ────────────────────────────────────────────
/**
 * Auto-generate slug dari display_name.
 * Contoh: "Servis Mobil" → "servis-mobil"
 */
export function CategoryService_generateSlug(
  displayName: string,
  parentSlug?: string
): string {
  const base = displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return parentSlug ? `${parentSlug}/${base}` : base
}
