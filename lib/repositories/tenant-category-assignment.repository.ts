// lib/repositories/tenant-category-assignment.repository.ts
// Repository untuk tabel tenant_category_assignments — akses DB only.
// TIDAK ada logika bisnis — hanya query dan return data.
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.3
// Update: Sesi #327 — F-03: fix coverage area — baca dari junction table assignment_coverage_areas
//                           hapus semua logika yang baca kolom legacy coverage_areas
// Update: Sesi #335 — BUG-KATEGORI-OVERLAP: assignViaSP teruskan coverage_area_entries
//                     sebagai p_city_entries ke SP untuk overlap check per area
// Update: Sesi #335b — FIX: kirim array JS langsung, bukan JSON.stringify (scalar error)
//
// ARSITEKTUR:
//   Service → TenantCategoryAssignmentRepository → DB (tabel tenant_category_assignments)
//   Dipakai oleh: tenant-category-assignment.service.ts
//
// ⛔ ATURAN: kolom coverage_areas di tenant_category_assignments adalah LEGACY (S#327)
//    JANGAN pernah baca atau tulis kolom tersebut dari file ini.
//    Sumber data coverage area yang benar: junction table assignment_coverage_areas

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  TenantCategoryAssignment,
  AssignmentDenganKategori,
  CoverageAreaDetail,
  AssignmentSummary,
  AssignmentFilter,
  AssignKategoriPayload,
  SuspendAssignmentPayload,
  RevokeAssignmentPayload,
} from '@/lib/types/tenant-category-assignment.types'

// ─── FUNGSI: findByTenantId ───────────────────────────────────────────────────
/**
 * Ambil semua assignment milik satu tenant, dengan detail kategori + coverage area aktual.
 * Untuk Tab Kategori di halaman Detail Tenant.
 * S#327 F-03: join assignment_coverage_areas (junction table) — bukan kolom legacy coverage_areas
 */
export async function findByTenantId(
  tenantId: string,
  filter?: AssignmentFilter
): Promise<AssignmentDenganKategori[]> {
  const db = createServerSupabaseClient()

  let query = db
    .from('tenant_category_assignments')
    .select(`
      id, tenant_id, category_id, status,
      commission_override, sla_minutes,
      assigned_by, assigned_at,
      suspended_by, suspended_at, suspend_reason,
      handover_to_tenant_id, handover_initiated_at, handover_initiated_by,
      created_at, created_by, updated_at, updated_by,
      deleted_at, deleted_by, revoke_reason,
      categories!inner(id, slug, display_name, level, parent_id,
        parent:categories!parent_id(display_name)),
      assignment_coverage_areas(
        province_id, city_id,
        provinces(name),
        cities(name)
      )
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('assigned_at', { ascending: false })

  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status)
  }
  if (filter?.search) {
    query = query.ilike('categories.display_name', `%${filter.search}%`)
  }

  const { data, error } = await query
  if (error || !data) return []

  return (data as unknown[]).map((row: unknown): AssignmentDenganKategori => {
    const r   = row as Record<string, unknown>
    const cat = r['categories'] as Record<string, unknown>
    const parentName = (cat['parent'] as Record<string, unknown> | null)?.['display_name'] as string | null

    const breadcrumb = {
      id:           cat['id'] as string,
      display_name: cat['display_name'] as string,
      slug:         cat['slug'] as string,
      level:        cat['level'] as 1 | 2,
      parent_name:  parentName ?? null,
    }

    // S#327 F-03: baca coverage area dari junction table, bukan kolom legacy
    const coverageRows = (r['assignment_coverage_areas'] as unknown[] | null) ?? []
    const coverageDetail: CoverageAreaDetail[] = coverageRows.map((ca: unknown) => {
      const c  = ca as Record<string, unknown>
      const prov = c['provinces'] as Record<string, unknown> | null
      const city = c['cities']    as Record<string, unknown> | null
      return {
        province_id:   c['province_id'] as string,
        province_name: (prov?.['name'] as string | null) ?? '',
        city_id:       (c['city_id']   as string | null) ?? null,
        city_name:     (city?.['name'] as string | null) ?? null,
      }
    })

    const override = r['commission_override'] as string | null
    const tampilKomisi = override
      ? `Override: ${(parseFloat(override) * 100).toFixed(2)}%`
      : 'Ikut kontrak'

    return {
      id:                    r['id'] as string,
      tenant_id:             r['tenant_id'] as string,
      category_id:           r['category_id'] as string,
      status:                r['status'] as 'active' | 'suspended' | 'pending_handover',
      commission_override:   override,
      sla_minutes:           r['sla_minutes'] as number | null,
      assigned_by:           r['assigned_by'] as string | null,
      assigned_at:           r['assigned_at'] as string,
      suspended_by:          r['suspended_by'] as string | null,
      suspended_at:          r['suspended_at'] as string | null,
      suspend_reason:        r['suspend_reason'] as string | null,
      handover_to_tenant_id: r['handover_to_tenant_id'] as string | null,
      handover_initiated_at: r['handover_initiated_at'] as string | null,
      handover_initiated_by: r['handover_initiated_by'] as string | null,
      created_at:            r['created_at'] as string,
      created_by:            r['created_by'] as string | null,
      updated_at:            r['updated_at'] as string,
      updated_by:            r['updated_by'] as string | null,
      deleted_at:            r['deleted_at'] as string | null,
      deleted_by:            r['deleted_by'] as string | null,
      revoke_reason:         r['revoke_reason'] as string | null,
      kategori:              breadcrumb,
      rate_kontrak:          null,           // diisi di service layer dari kontrak tenant
      tampil_komisi:         tampilKomisi,
      coverage_areas_detail: coverageDetail, // S#327 F-03: dari junction table
    }
  })
}

// ─── FUNGSI: getSummaryByTenantId ─────────────────────────────────────────────
/**
 * Hitung 2 kartu summary Tab Kategori.
 * S#327 F-03: coverage_summary dihapus — card Coverage Area dihapus dari UI.
 *             Query tidak lagi menyentuh kolom legacy coverage_areas.
 */
export async function getSummaryByTenantId(
  tenantId: string
): Promise<AssignmentSummary> {
  const db = createServerSupabaseClient()
  const { data } = await db
    .from('tenant_category_assignments')
    .select('status, commission_override')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (!data) return { total_aktif: 0, total_override_komisi: 0 }

  return {
    total_aktif:           data.length,
    total_override_komisi: data.filter(a => a.commission_override !== null).length,
  }
}

// ─── FUNGSI: findById ─────────────────────────────────────────────────────────
/**
 * Ambil satu assignment berdasarkan ID.
 */
export async function findById(
  id: string
): Promise<TenantCategoryAssignment | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_category_assignments')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as TenantCategoryAssignment
}

// ─── FUNGSI: assignViaSP ──────────────────────────────────────────────────────
/**
 * Assign kategori ke tenant via SP sp_assign_category_to_tenant.
 * SP menangani konflik dengan cek overlap area (S#335 BUG-KATEGORI-OVERLAP).
 *
 * S#335: teruskan coverage_area_entries sebagai p_city_entries (JSONB) ke SP.
 * SP akan cek 4 skenario overlap area sebelum insert.
 * Jika coverage_area_entries tidak ada, SP fallback ke guard global (backward compat).
 *
 * S#335b FIX: kirim array JS langsung — BUKAN JSON.stringify.
 * JSON.stringify menghasilkan text scalar → PostgreSQL error "cannot get array length of a scalar".
 * Supabase client (.rpc) yang handle serialisasi object/array ke JSONB secara otomatis.
 */
export async function assignViaSP(
  payload: AssignKategoriPayload,
  assignedBy: string
): Promise<{ ok: boolean; assignmentId?: string; error?: string }> {
  const db = createServerSupabaseClient()

  // S#335: bangun p_city_entries dari coverage_area_entries payload
  // WAJIB kirim sebagai array JS — jangan JSON.stringify
  // Supabase client akan serialisasi ke JSONB otomatis
  const cityEntries = payload.coverage_area_entries && payload.coverage_area_entries.length > 0
    ? payload.coverage_area_entries.map(e => ({
        province_id: e.province_id,
        city_id:     e.city_id ?? null,
      }))
    : null

  const { data, error } = await db.rpc('sp_assign_category_to_tenant', {
    p_tenant_id:           payload.tenant_id,
    p_category_id:         payload.category_id,
    p_commission_override: payload.commission_override ?? null,
    p_coverage_areas:      null,        // S#327 F-03: selalu NULL — data real di assignment_coverage_areas
    p_sla_minutes:         payload.sla_minutes ?? null,
    p_assigned_by:         assignedBy,
    p_city_entries:        cityEntries, // S#335: array JS langsung — bukan JSON.stringify
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true, assignmentId: data as string }
}

// ─── FUNGSI: suspendAssignment ────────────────────────────────────────────────
/**
 * Tangguhkan sementara assignment (status → 'suspended').
 */
export async function suspendAssignment(
  id: string,
  payload: SuspendAssignmentPayload,
  suspendedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_category_assignments')
    .update({
      status:       'suspended',
      suspended_by: suspendedBy,
      suspended_at: new Date().toISOString(),
      suspend_reason: payload.suspend_reason,
      updated_by:   suspendedBy,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'active')
    .is('deleted_at', null)

  return !error
}

// ─── FUNGSI: aktivasiKembali ──────────────────────────────────────────────────
/**
 * Aktifkan kembali assignment yang ditangguhkan (status → 'active').
 */
export async function aktivasiKembali(
  id: string,
  updatedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_category_assignments')
    .update({
      status:       'active',
      suspended_by: null,
      suspended_at: null,
      suspend_reason: null,
      updated_by:   updatedBy,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'suspended')
    .is('deleted_at', null)

  return !error
}

// ─── FUNGSI: revokeViaSP ──────────────────────────────────────────────────────
/**
 * Cabut assignment via SP sp_revoke_category_from_tenant (soft delete).
 */
export async function revokeViaSP(
  assignmentId: string,
  payload: RevokeAssignmentPayload,
  revokedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_revoke_category_from_tenant', {
    p_assignment_id: assignmentId,
    p_revoke_reason: payload.revoke_reason,
    p_revoked_by:    revokedBy,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── FUNGSI: initHandoverViaSP ────────────────────────────────────────────────
/**
 * Inisiasi handover via SP sp_transfer_category_between_tenants.
 */
export async function initHandoverViaSP(
  fromAssignmentId: string,
  toTenantId: string,
  initiatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_transfer_category_between_tenants', {
    p_from_assignment_id: fromAssignmentId,
    p_to_tenant_id:       toTenantId,
    p_initiated_by:       initiatedBy,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// --- FUNGSI: tcaRepo_insertCoverageAreas -----------------------------------
/**
 * Insert baris coverage area untuk satu assignment.
 * Dibuat: Sesi #179 - PV-07: pindah dari TCAService_assign ke repository layer.
 * Dipanggil oleh: TCAService_assign (tenant-category-assignment.service.ts)
 * @param assignmentId - UUID assignment yang baru dibuat
 * @param entries      - Array province+city yang di-cover
 */
export async function tcaRepo_insertCoverageAreas(
  assignmentId: string,
  entries: Array<{ province_id: string; city_id?: string | null }>
): Promise<void> {
  if (!entries.length) return
  const db  = createServerSupabaseClient()
  const rows = entries.map(entry => ({
    assignment_id: assignmentId,
    province_id:   entry.province_id,
    city_id:       entry.city_id ?? null,
  }))
  const { error } = await db
    .from('assignment_coverage_areas')
    .insert(rows)
  if (error) {
    console.error('[tcaRepo_insertCoverageAreas] insert error:', error.message)
  }
}

// --- FUNGSI: tcaRepo_updateOverrideKomisi ----------------------------------
/**
 * Update override komisi, coverage areas, dan SLA untuk satu assignment.
 * Dibuat: Sesi #179 - PV-08: pindah dari TCAService_updateOverrideKomisi ke repository layer.
 * Dipanggil oleh: TCAService_updateOverrideKomisi (tenant-category-assignment.service.ts)
 * @returns true jika berhasil, false jika error
 */
export async function tcaRepo_updateOverrideKomisi(
  assignmentId: string,
  payload: {
    commission_override?: number | null
    // coverage_areas dihapus S#327 F-03 — kolom legacy, tidak diupdate lagi
    sla_minutes?:         number | null
  },
  updatedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_category_assignments')
    .update({
      commission_override: payload.commission_override ?? null,
      // S#327 F-03: coverage_areas tidak diupdate — kolom legacy selalu NULL
      sla_minutes:         payload.sla_minutes         ?? undefined,
      updated_by:          updatedBy,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .is('deleted_at', null)

  return !error
}

// --- FUNGSI: categoryAssignmentRepo_countActiveByCategory ------------------────
/**
 * Hitung jumlah assignment aktif untuk satu kategori.
 * Status yang dihitung: active, suspended, pending_handover.
 *
 * Dipakai oleh: CategoryService_hapus() sebagai guard sebelum soft delete
 * khusus untuk sub-kategori (level 2).
 * Memindahkan query DB dari service layer ke repository layer (fix PV-03 S#177).
 *
 * @returns Jumlah assignment aktif (0 = aman dihapus)
 */
export async function categoryAssignmentRepo_countActiveByCategory(
  categoryId: string
): Promise<number> {
  const db = createServerSupabaseClient()
  const { count } = await db
    .from('tenant_category_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .in('status', ['active', 'suspended', 'pending_handover'])
    .is('deleted_at', null)

  return count ?? 0
}

// --- FUNGSI: categoryAssignmentRepo_countActiveByRoot -----------------------
/**
 * Hitung jumlah assignment aktif untuk root kategori + semua sub-kategorinya.
 * Status yang dihitung: active, suspended, pending_handover.
 *
 * Dipakai oleh: CategoryService_hapus() sebagai guard sebelum soft delete
 * khusus untuk root kategori (level 1) — rollup mencakup semua sub.
 *
 * Logika:
 *   1. Hitung assignment langsung di root (category_id = rootId)
 *   2. Hitung assignment di sub-kategori mana pun yang parent_id = rootId
 *   3. Jumlahkan keduanya
 *
 * Dibuat: Sesi #308 — Fix TEMUAN-S307-01
 * @returns Jumlah assignment aktif di root + semua sub (0 = aman dihapus)
 */
export async function categoryAssignmentRepo_countActiveByRoot(
  rootId: string
): Promise<number> {
  const db = createServerSupabaseClient()

  // Step 1: ambil ID semua sub-kategori yang parent_id = rootId
  const { data: subs } = await db
    .from('categories')
    .select('id')
    .eq('parent_id', rootId)
    .is('deleted_at', null)

  const subIds = (subs ?? []).map((s: { id: string }) => s.id)

  // Step 2: hitung assignment aktif di root + semua subnya sekaligus
  const allIds = [rootId, ...subIds]

  const { count } = await db
    .from('tenant_category_assignments')
    .select('id', { count: 'exact', head: true })
    .in('category_id', allIds)
    .in('status', ['active', 'suspended', 'pending_handover'])
    .is('deleted_at', null)

  return count ?? 0
}
