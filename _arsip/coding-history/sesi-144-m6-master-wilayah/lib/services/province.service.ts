// ARSIP — kondisi pre-S#144 (Master Wilayah)
// lib/services/province.service.ts
// Service untuk provinces + cities (coverage area assignment)
// Dibuat: Sesi #143 — M6 Coverage Area Revamp

import {
  ProvinceRepo_getAll,
  ProvinceRepo_getCitiesByProvince,
  ProvinceRepo_getWithExclusion,
  ProvinceRepo_getCitiesWithExclusion,
} from '@/lib/repositories/province.repository'
import type { Province, City, ProvinceOption, CityOption } from '@/lib/types/province.types'

export async function ProvinceService_getAll(): Promise<Province[]> {
  return ProvinceRepo_getAll()
}

export async function ProvinceService_getCitiesByProvince(
  provinceId: string
): Promise<City[]> {
  if (!provinceId) throw new Error('province_id wajib diisi')
  return ProvinceRepo_getCitiesByProvince(provinceId)
}

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
