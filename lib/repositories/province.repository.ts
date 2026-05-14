// lib/repositories/province.repository.ts
// Repository untuk provinces + cities + assignment_coverage_areas
// Dibuat: Sesi #143 — M6 Coverage Area Revamp
// Updated: Sesi #144 — tambah fungsi admin CRUD (Master Wilayah)

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Province, City, ProvinceOption, CityOption } from '@/lib/types/province.types'

// ─── Provinsi: ambil semua yang aktif (untuk combobox assign) ────────────────

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

// ─── Provinsi: ambil SEMUA (aktif + nonaktif) untuk halaman admin ─────────────

export async function ProvinceRepo_getAllForAdmin(): Promise<(Province & { city_count: number })[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('provinces')
    .select('id, code, name, sort_order, is_active, created_at')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`ProvinceRepo_getAllForAdmin: ${error.message}`)
  const provinces = data ?? []

  // Hitung city_count per provinsi
  const { data: cityCounts, error: eCounts } = await supabase
    .from('cities')
    .select('province_id')
    .in('province_id', provinces.map(p => p.id))

  if (eCounts) throw new Error(`ProvinceRepo_getAllForAdmin city_count: ${eCounts.message}`)

  const countMap = new Map<string, number>()
  for (const row of (cityCounts ?? [])) {
    countMap.set(row.province_id, (countMap.get(row.province_id) ?? 0) + 1)
  }

  return provinces.map(p => ({ ...p, city_count: countMap.get(p.id) ?? 0 }))
}

// ─── Provinsi: tambah baru ────────────────────────────────────────────────────

export async function ProvinceRepo_create(data: {
  code: string
  name: string
  sort_order: number
}): Promise<Province> {
  const supabase = await createServerSupabaseClient()
  const { data: row, error } = await supabase
    .from('provinces')
    .insert({ code: data.code, name: data.name, sort_order: data.sort_order, is_active: true })
    .select('id, code, name, sort_order, is_active, created_at')
    .single()

  if (error) throw new Error(`ProvinceRepo_create: ${error.message}`)
  return row
}

// ─── Provinsi: update (nama / status aktif) ───────────────────────────────────

export async function ProvinceRepo_update(
  id: string,
  data: Partial<{ name: string; code: string; is_active: boolean }>
): Promise<Province> {
  const supabase = await createServerSupabaseClient()
  const { data: row, error } = await supabase
    .from('provinces')
    .update(data)
    .eq('id', id)
    .select('id, code, name, sort_order, is_active, created_at')
    .single()

  if (error) throw new Error(`ProvinceRepo_update: ${error.message}`)
  return row
}

// ─── Kota: ambil per provinsi (hanya aktif — untuk combobox assign) ───────────

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

// ─── Kota: ambil per provinsi (aktif + nonaktif) untuk halaman admin ──────────

export async function ProvinceRepo_getCitiesForAdmin(
  provinceId: string
): Promise<City[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cities')
    .select('id, province_id, code, name, type, sort_order, is_active, created_at')
    .eq('province_id', provinceId)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`ProvinceRepo_getCitiesForAdmin: ${error.message}`)
  return data ?? []
}

// ─── Kota: tambah baru ────────────────────────────────────────────────────────

export async function ProvinceRepo_createCity(data: {
  province_id: string
  code:        string | null
  name:        string
  type:        'kota' | 'kabupaten'
  sort_order:  number
}): Promise<City> {
  const supabase = await createServerSupabaseClient()
  const { data: row, error } = await supabase
    .from('cities')
    .insert({ ...data, is_active: true })
    .select('id, province_id, code, name, type, sort_order, is_active, created_at')
    .single()

  if (error) throw new Error(`ProvinceRepo_createCity: ${error.message}`)
  return row
}

// ─── Kota: update (nama / tipe / status aktif) ───────────────────────────────

export async function ProvinceRepo_updateCity(
  id: string,
  data: Partial<{ name: string; code: string | null; type: 'kota' | 'kabupaten'; is_active: boolean }>
): Promise<City> {
  const supabase = await createServerSupabaseClient()
  const { data: row, error } = await supabase
    .from('cities')
    .update(data)
    .eq('id', id)
    .select('id, province_id, code, name, type, sort_order, is_active, created_at')
    .single()

  if (error) throw new Error(`ProvinceRepo_updateCity: ${error.message}`)
  return row
}

// ─── Provinsi + kota dengan filter exclusion (untuk dialog assign) ────────────

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

// ─── Kota dengan exclusion status (untuk dialog assign) ──────────────────────

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
