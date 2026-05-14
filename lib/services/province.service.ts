// lib/services/province.service.ts
// Service untuk provinces + cities (coverage area + Master Wilayah admin)
// Dibuat: Sesi #143 — M6 Coverage Area Revamp
// Updated: Sesi #144 — tambah service admin CRUD (Master Wilayah)

import {
  ProvinceRepo_getAll,
  ProvinceRepo_getAllForAdmin,
  ProvinceRepo_create,
  ProvinceRepo_update,
  ProvinceRepo_getCitiesByProvince,
  ProvinceRepo_getCitiesForAdmin,
  ProvinceRepo_createCity,
  ProvinceRepo_updateCity,
  ProvinceRepo_getWithExclusion,
  ProvinceRepo_getCitiesWithExclusion,
} from '@/lib/repositories/province.repository'
import type { Province, City, ProvinceOption, CityOption } from '@/lib/types/province.types'

// ─── READ: untuk combobox assign ─────────────────────────────────────────────

export async function ProvinceService_getAll(): Promise<Province[]> {
  return ProvinceRepo_getAll()
}

export async function ProvinceService_getCitiesByProvince(
  provinceId: string
): Promise<City[]> {
  if (!provinceId) throw new Error('province_id wajib diisi')
  return ProvinceRepo_getCitiesByProvince(provinceId)
}

// ─── READ: untuk halaman admin Master Wilayah ─────────────────────────────────

export async function ProvinceService_getAllForAdmin(): Promise<(Province & { city_count: number })[]> {
  return ProvinceRepo_getAllForAdmin()
}

export async function ProvinceService_getCitiesForAdmin(provinceId: string): Promise<City[]> {
  if (!provinceId) throw new Error('province_id wajib diisi')
  return ProvinceRepo_getCitiesForAdmin(provinceId)
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function ProvinceService_create(data: {
  code: string
  name: string
  sort_order: number
}): Promise<Province> {
  if (!data.name?.trim()) throw new Error('Nama provinsi wajib diisi')
  if (!data.code?.trim()) throw new Error('Kode BPS wajib diisi')
  return ProvinceRepo_create({
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    sort_order: data.sort_order,
  })
}

export async function ProvinceService_createCity(provinceId: string, data: {
  name:       string
  code:       string | null
  type:       'kota' | 'kabupaten'
  sort_order: number
}): Promise<City> {
  if (!provinceId) throw new Error('province_id wajib diisi')
  if (!data.name?.trim()) throw new Error('Nama kab/kota wajib diisi')
  return ProvinceRepo_createCity({
    province_id: provinceId,
    code:        data.code?.trim() || null,
    name:        data.name.trim(),
    type:        data.type,
    sort_order:  data.sort_order,
  })
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function ProvinceService_update(
  id: string,
  data: Partial<{ name: string; code: string; is_active: boolean }>
): Promise<Province> {
  if (!id) throw new Error('id provinsi wajib diisi')
  return ProvinceRepo_update(id, data)
}

export async function ProvinceService_updateCity(
  id: string,
  data: Partial<{ name: string; code: string | null; type: 'kota' | 'kabupaten'; is_active: boolean }>
): Promise<City> {
  if (!id) throw new Error('id kota wajib diisi')
  return ProvinceRepo_updateCity(id, data)
}

// ─── Ambil provinsi dengan filter exclusion (untuk dialog assign) ─────────────

export async function ProvinceService_getAvailableForAssignment(
  categoryId: string,
  currentTenantId: string
): Promise<{ provinces: ProvinceOption[]; globallyTaken: boolean }> {
  if (!categoryId) throw new Error('category_id wajib diisi')
  if (!currentTenantId) throw new Error('tenant_id wajib diisi')
  return ProvinceRepo_getWithExclusion(categoryId, currentTenantId)
}

export async function ProvinceService_getCitiesWithExclusion(
  provinceId: string,
  excludedCityIds: string[]
): Promise<CityOption[]> {
  if (!provinceId) throw new Error('province_id wajib diisi')
  return ProvinceRepo_getCitiesWithExclusion(provinceId, excludedCityIds)
}
