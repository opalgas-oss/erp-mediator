// lib/repositories/tenant-category-assignment.repository.ts
// Repository untuk tabel tenant_category_assignments — akses DB only.
// TIDAK ada logika bisnis — hanya query dan return data.
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.3
//
// ARSITEKTUR:
//   Service → TenantCategoryAssignmentRepository → DB (tabel tenant_category_assignments)
//   Dipakai oleh: tenant-category-assignment.service.ts

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  TenantCategoryAssignment,
  AssignmentDenganKategori,
  AssignmentSummary,
  AssignmentFilter,
  AssignKategoriPayload,
  SuspendAssignmentPayload,
  RevokeAssignmentPayload,
} from '@/lib/types/tenant-category-assignment.types'

// ─── FUNGSI: findByTenantId ───────────────────────────────────────────────────
/**
 * Ambil semua assignment milik satu tenant, dengan detail kategori.
 * Untuk Tab Kategori di halaman Detail Tenant.
 */
export async function findByTenantId(
  tenantId: string,
  filter?: AssignmentFilter
): Promise<AssignmentDenganKategori[]> {
  const db = createServerSupabaseClient()

  let query = db
    .from('tenant_category_assignments')
    .select(`
      *,
      categories!inner(id, slug, display_name, level, parent_id,
        parent:categories!parent_id(display_name))
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
      coverage_areas:        r['coverage_areas'] as string[] | null,
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
      rate_kontrak:          null,   // diisi di service layer dari kontrak tenant
      tampil_komisi:         tampilKomisi,
    }
  })
}

// ─── FUNGSI: getSummaryByTenantId ─────────────────────────────────────────────
/**
 * Hitung 3 kartu summary Tab Kategori.
 */
export async function getSummaryByTenantId(
  tenantId: string
): Promise<AssignmentSummary> {
  const db = createServerSupabaseClient()
  const { data } = await db
    .from('tenant_category_assignments')
    .select('status, commission_override, coverage_areas')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('deleted_at', null)

  if (!data) return { total_aktif: 0, total_override_komisi: 0, coverage_summary: 'BELUM_SETTING' }

  const totalAktif        = data.length
  const totalOverride     = data.filter(a => a.commission_override !== null).length
  const allAreas          = data.flatMap(a => a.coverage_areas ?? [])
  const uniqueAreas       = [...new Set(allAreas)]

  // Bedakan 2 kondisi:
  // - Belum ada assignment sama sekali (totalAktif===0) → 'BELUM_SETTING' → UI tampil "Belum disetting"
  // - Ada assignment tapi tidak ada coverage spesifik → 'Seluruh Indonesia' (memang by design)
  const coverageSummary   = totalAktif === 0
    ? 'BELUM_SETTING'
    : uniqueAreas.length === 0
      ? 'Seluruh Indonesia'
      : uniqueAreas.slice(0, 3).join(', ') + (uniqueAreas.length > 3 ? ', ...' : '')

  return {
    total_aktif:           totalAktif,
    total_override_komisi: totalOverride,
    coverage_summary:      coverageSummary,
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
 * SP menangani konflik (cek kategori sudah dipegang tenant lain).
 */
export async function assignViaSP(
  payload: AssignKategoriPayload,
  assignedBy: string
): Promise<{ ok: boolean; assignmentId?: string; error?: string }> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_assign_category_to_tenant', {
    p_tenant_id:           payload.tenant_id,
    p_category_id:         payload.category_id,
    p_commission_override: payload.commission_override ?? null,
    p_coverage_areas:      payload.coverage_areas ?? null,
    p_sla_minutes:         payload.sla_minutes ?? null,
    p_assigned_by:         assignedBy,
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

// ─── FUNGSI: categoryAssignmentRepo_countActiveByCategory ─────────────────────
/**
 * Hitung jumlah assignment aktif untuk satu kategori.
 * Status yang dihitung: active, suspended, pending_handover.
 *
 * Dipakai oleh: CategoryService_hapus() sebagai guard sebelum soft delete.
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
