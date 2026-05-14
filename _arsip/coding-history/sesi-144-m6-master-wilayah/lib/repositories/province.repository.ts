// ARSIP — kondisi pre-S#144 (Master Wilayah)
// lib/repositories/province.repository.ts
// Repository untuk provinces + cities + assignment_coverage_areas
// Dibuat: Sesi #143 — M6 Coverage Area Revamp

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Province, City, ProvinceOption, CityOption } from '@/lib/types/province.types'

// ─── Provinsi: ambil semua yang aktif ────────────────────────────────────────

export async function ProvinceRepo_getAll(): Promise<Province[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('provinces')
    .select('id, code, name, sort_order, is_active, created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`ProvinceRepo_getAll: ${error.message}`)
  return data ?? []
}

// ─── Kota: ambil per provinsi ─────────────────────────────────────────────────

export async function ProvinceRepo_getCitiesByProvince(
  provinceId: string
): Promise<City[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cities')
    .select('id, province_id, code, name, type, sort_order, is_active, created_at')
    .eq('province_id', provinceId)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`ProvinceRepo_getCitiesByProvince: ${error.message}`)
  return data ?? []
}

// ─── Provinsi + kota dengan filter exclusion ──────────────────────────────────

export async function ProvinceRepo_getWithExclusion(
  categoryId: string,
  currentTenantId: string
): Promise<{ provinces: ProvinceOption[]; globallyTaken: boolean }> {
  const supabase = await createServerSupabaseClient()

  const { data: otherAssignments, error: eAssign } = await supabase
    .from('tenant_category_assignments')
    .select('id, tenant_id')
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .neq('tenant_id', currentTenantId)

  if (eAssign) throw new Error(`ProvinceRepo_getWithExclusion assignments: ${eAssign.message}`)

  let globallyTaken = false
  const excludedProvinces = new Map<string, Set<string | null>>()

  if (otherAssignments && otherAssignments.length > 0) {
    const assignmentIds = otherAssignments.map(a => a.id)

    const { data: coverageRows, error: eCov } = await supabase
      .from('assignment_coverage_areas')
      .select('assignment_id, province_id, city_id')
      .in('assignment_id', assignmentIds)

    if (eCov) throw new Error(`ProvinceRepo_getWithExclusion coverage: ${eCov.message}`)

    const assignmentsWithCoverage = new Set((coverageRows ?? []).map(c => c.assignment_id))
    const hasGlobalAssignment = otherAssignments.some(a => !assignmentsWithCoverage.has(a.id))
    if (hasGlobalAssignment) globallyTaken = true

    for (const row of (coverageRows ?? [])) {
      if (!excludedProvinces.has(row.province_id)) {
        excludedProvinces.set(row.province_id, new Set())
      }
      excludedProvinces.get(row.province_id)!.add(row.city_id)
    }
  }

  if (globallyTaken) return { provinces: [], globallyTaken: true }

  const { data: provinces, error: eProv } = await supabase
    .from('provinces')
    .select('id, code, name, sort_order, is_active, created_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (eProv) throw new Error(`ProvinceRepo_getWithExclusion provinces: ${eProv.message}`)

  const result: ProvinceOption[] = (provinces ?? []).map(p => {
    const exclusionSet = excludedProvinces.get(p.id)

    if (!exclusionSet) {
      return { ...p, availability: 'tersedia' as const, excluded_city_ids: [], all_cities_taken: false }
    }
    if (exclusionSet.has(null)) {
      return { ...p, availability: 'penuh' as const, excluded_city_ids: [], all_cities_taken: true }
    }

    const excludedCityIds = Array.from(exclusionSet).filter(Boolean) as string[]
    return { ...p, availability: 'sebagian' as const, excluded_city_ids: excludedCityIds, all_cities_taken: false }
  })

  return { provinces: result, globallyTaken: false }
}

// ─── Kota dengan exclusion status ────────────────────────────────────────────

export async function ProvinceRepo_getCitiesWithExclusion(
  provinceId: string,
  excludedCityIds: string[]
): Promise<CityOption[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cities')
    .select('id, province_id, code, name, type, sort_order, is_active, created_at')
    .eq('province_id', provinceId)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`ProvinceRepo_getCitiesWithExclusion: ${error.message}`)

  return (data ?? []).map(c => ({
    ...c,
    is_excluded: excludedCityIds.includes(c.id),
  }))
}
