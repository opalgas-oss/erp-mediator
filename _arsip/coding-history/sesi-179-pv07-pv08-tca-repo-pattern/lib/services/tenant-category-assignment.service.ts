// lib/services/tenant-category-assignment.service.ts
// [ARSIP PRE-PV07+PV08 S#179]
// Pelanggaran PV-07: TCAService_assign() direct createServerSupabaseClient()+insert ke assignment_coverage_areas
// Pelanggaran PV-08: TCAService_updateOverrideKomisi() direct createServerSupabaseClient()+update di service

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  findByTenantId,
  findById,
  getSummaryByTenantId,
  assignViaSP,
  suspendAssignment,
  aktivasiKembali,
  revokeViaSP,
  initHandoverViaSP,
} from '@/lib/repositories/tenant-category-assignment.repository'
import type {
  AssignmentTabData,
  AssignKategoriPayload,
  BatchAssignPayload,
  SuspendAssignmentPayload,
  RevokeAssignmentPayload,
  HandoverPayload,
  UpdateOverridePayload,
  AssignmentFilter,
} from '@/lib/types/tenant-category-assignment.types'

function validateCommissionOverride(rate: number | null | undefined): void {
  if (rate === null || rate === undefined) return
  if (rate < 0 || rate > 1) throw new Error('Override komisi harus antara 0 dan 1 (contoh: 0.08 = 8%)')
}

export async function TCAService_getTabData(tenantId: string, filter?: AssignmentFilter): Promise<AssignmentTabData> {
  const [assignments, summary] = await Promise.all([findByTenantId(tenantId, filter), getSummaryByTenantId(tenantId)])
  return { summary, assignments }
}

// PV-07 VIOLATION: direct DB insert di service layer
export async function TCAService_assign(payload: AssignKategoriPayload, assignedBy: string): Promise<{ assignment_id: string }> {
  validateCommissionOverride(payload.commission_override)
  const result = await assignViaSP(payload, assignedBy)
  if (!result.ok || !result.assignmentId) throw new Error(result.error ?? 'Gagal assign kategori')
  if (payload.coverage_area_entries && payload.coverage_area_entries.length > 0) {
    const supabase = await createServerSupabaseClient()  // VIOLATION
    const rows = payload.coverage_area_entries.map(entry => ({ assignment_id: result.assignmentId!, province_id: entry.province_id, city_id: entry.city_id ?? null }))
    const { error: eCov } = await supabase.from('assignment_coverage_areas').insert(rows)  // VIOLATION
    if (eCov) console.error('[TCAService_assign] coverage insert error:', eCov.message)
  }
  return { assignment_id: result.assignmentId! }
}

export async function TCAService_batchAssign(payload: BatchAssignPayload, assignedBy: string): Promise<{ berhasil: string[]; gagal: Array<{ category_id: string; alasan: string }> }> {
  const berhasil: string[] = []; const gagal: Array<{ category_id: string; alasan: string }> = []
  for (const item of payload.assignments) {
    try {
      const result = await TCAService_assign({ tenant_id: payload.tenant_id, category_id: item.category_id, commission_override: item.commission_override ?? null, coverage_areas: item.coverage_areas ?? null, sla_minutes: item.sla_minutes ?? null }, assignedBy)
      berhasil.push(result.assignment_id)
    } catch (err) { gagal.push({ category_id: item.category_id, alasan: err instanceof Error ? err.message : 'Gagal tidak diketahui' }) }
  }
  return { berhasil, gagal }
}

export async function TCAService_suspend(assignmentId: string, payload: SuspendAssignmentPayload, suspendedBy: string): Promise<void> {
  if (!payload.suspend_reason?.trim()) throw new Error('Alasan penangguhan wajib diisi')
  const assignment = await findById(assignmentId)
  if (!assignment) throw new Error('Assignment tidak ditemukan')
  if (assignment.status !== 'active') throw new Error('Hanya assignment aktif yang bisa ditangguhkan')
  const ok = await suspendAssignment(assignmentId, payload, suspendedBy)
  if (!ok) throw new Error('Gagal menangguhkan assignment')
}

export async function TCAService_aktifkanKembali(assignmentId: string, reactivatedBy: string): Promise<void> {
  const assignment = await findById(assignmentId)
  if (!assignment) throw new Error('Assignment tidak ditemukan')
  if (assignment.status !== 'suspended') throw new Error('Hanya assignment yang ditangguhkan yang bisa diaktifkan kembali')
  const ok = await aktivasiKembali(assignmentId, reactivatedBy)
  if (!ok) throw new Error('Gagal mengaktifkan kembali assignment')
}

export async function TCAService_cabut(assignmentId: string, payload: RevokeAssignmentPayload, revokedBy: string): Promise<void> {
  if (!payload.revoke_reason?.trim()) throw new Error('Alasan pencabutan wajib diisi')
  const assignment = await findById(assignmentId)
  if (!assignment) throw new Error('Assignment tidak ditemukan')
  if (assignment.deleted_at) throw new Error('Assignment sudah dicabut sebelumnya')
  const result = await revokeViaSP(assignmentId, payload, revokedBy)
  if (!result.ok) throw new Error(result.error ?? 'Gagal mencabut penugasan')
}

export async function TCAService_handover(payload: HandoverPayload, initiatedBy: string): Promise<void> {
  const result = await initHandoverViaSP(payload.from_assignment_id, payload.to_tenant_id, initiatedBy)
  if (!result.ok) throw new Error(result.error ?? 'Gagal inisiasi handover')
}

// PV-08 VIOLATION: direct DB update di service layer
export async function TCAService_updateOverrideKomisi(assignmentId: string, payload: UpdateOverridePayload, updatedBy: string): Promise<void> {
  validateCommissionOverride(payload.commission_override)
  const db = createServerSupabaseClient()  // VIOLATION
  const { error } = await db.from('tenant_category_assignments').update({  // VIOLATION
    commission_override: payload.commission_override ?? null, coverage_areas: payload.coverage_areas ?? undefined,
    sla_minutes: payload.sla_minutes ?? undefined, updated_by: updatedBy, updated_at: new Date().toISOString(),
  }).eq('id', assignmentId).is('deleted_at', null)
  if (error) throw new Error('Gagal mengupdate override komisi')
}
