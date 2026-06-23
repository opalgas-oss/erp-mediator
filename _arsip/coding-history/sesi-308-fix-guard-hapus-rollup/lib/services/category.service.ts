// lib/services/category.service.ts
// ARSIP SEBELUM EDIT — Sesi #308
// Alasan: Fix TEMUAN-S307-01: tambah categoryAssignmentRepo_countActiveByRoot()
//         dan update CategoryService_hapus() untuk rollup ke sub-kategori
// Tanggal arsip: 23 Juni 2026

import 'server-only'
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
import { categoryAssignmentRepo_countActiveByCategory } from '@/lib/repositories/tenant-category-assignment.repository'
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

const SLUG_REGEX = /^[a-z][a-z0-9-]*$/

function validateSlugKategori(slug: string): void {
  if (!slug || slug.length < 2 || slug.length > 80) {
    throw new Error('Slug kategori harus 2-80 karakter')
  }
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

export async function CategoryService_getById(id: string): Promise<Category | null> {
  if (!id) throw new Error('ID kategori wajib diisi')
  return findById(id)
}

export async function CategoryService_getAllDenganSub(): Promise<CategoryDenganSub[]> {
  return findAllDenganSub()
}

export async function CategoryService_getTreeForAssign(tenantId: string): Promise<CategoryTreeNode[]> {
  if (!tenantId) throw new Error('ID tenant wajib diisi')
  return buildTreeForAssignDialog(tenantId)
}

export async function CategoryService_buatRoot(
  payload: BuatRootCategoryPayload,
  createdBy: string
): Promise<Category> {
  validateDisplayName(payload.display_name)
  validateSlugKategori(payload.slug)
  if (payload.slug.includes('/')) {
    throw new Error('Slug root kategori tidak boleh mengandung "/". Gunakan format: "nama-kategori"')
  }
  const unik = await cekSlugUnique(payload.slug)
  if (!unik) throw new Error(`Slug "${payload.slug}" sudah digunakan oleh kategori lain`)
  const result = await insertRoot(payload, createdBy)
  if (!result) throw new Error('Gagal membuat kategori root')
  return result
}

export async function CategoryService_buatSub(
  payload: BuatSubCategoryPayload,
  createdBy: string
): Promise<Category> {
  validateDisplayName(payload.display_name)
  validateSlugKategori(payload.slug)
  const parent = await findById(payload.parent_id)
  if (!parent) throw new Error('Kategori induk tidak ditemukan')
  if (parent.level !== 1) throw new Error('Kategori induk harus root (level 1)')
  const expectedPrefix = parent.slug + '/'
  if (!payload.slug.startsWith(expectedPrefix)) {
    throw new Error(`Slug sub-kategori harus diawali "${expectedPrefix}". Contoh: "${parent.slug}/nama-sub"`)
  }
  const unik = await cekSlugUnique(payload.slug)
  if (!unik) throw new Error(`Slug "${payload.slug}" sudah digunakan`)
  const result = await insertSub(payload, createdBy)
  if (!result) throw new Error('Gagal membuat sub-kategori')
  return result
}

export async function CategoryService_update(
  id: string,
  payload: UpdateCategoryPayload,
  updatedBy: string
): Promise<Category> {
  if (payload.display_name) validateDisplayName(payload.display_name)
  if (payload.slug) {
    validateSlugKategori(payload.slug)
    const unik = await cekSlugUnique(payload.slug, id)
    if (!unik) throw new Error(`Slug "${payload.slug}" sudah digunakan kategori lain`)
  }
  const result = await update(id, payload, updatedBy)
  if (!result) throw new Error('Gagal mengupdate kategori. Pastikan kategori masih aktif.')
  return result
}

export async function CategoryService_hapus(
  id: string,
  deletedBy: string
): Promise<void> {
  const kategori = await findById(id)
  if (!kategori) throw new Error('Kategori tidak ditemukan')

  // Cek assignment aktif via repository layer (PV-03 fix S#177)
  const jumlahAktif = await categoryAssignmentRepo_countActiveByCategory(id)
  if (jumlahAktif > 0) {
    throw new Error(
      'Kategori tidak bisa dihapus karena masih dipegang tenant aktif. ' +
      'Cabut semua penugasan terlebih dahulu.'
    )
  }

  const isRoot = kategori.level === 1
  const ok     = await softDelete(id, deletedBy, isRoot)
  if (!ok) throw new Error('Gagal menghapus kategori')
}

export async function CategoryService_cekSlug(
  slug: string,
  excludeId?: string
): Promise<{ tersedia: boolean }> {
  try { validateSlugKategori(slug) }
  catch { return { tersedia: false } }
  const unik = await cekSlugUnique(slug, excludeId)
  return { tersedia: unik }
}

export function CategoryService_generateSlug(displayName: string, parentSlug?: string): string {
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
