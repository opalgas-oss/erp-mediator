// lib/services/tenant-category-assignment.service.ts
// Service layer untuk assignment kategori ke tenant — business logic.
// Dipakai oleh: API route handlers di app/api/superadmin/tenants/[id]/categories/
//
// ARSITEKTUR:
//   API Route → TCAService_* → tcaRepo_* (repository) → DB + SP
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.4

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

// ─── Validation Helpers ──────────────────────────────────────────────────────

function validateCommissionOverride(rate: number | null | undefined): void {
  if (rate === null || rate === undefined) return
  if (rate < 0 || rate > 1) {
    throw new Error('Override komisi harus antara 0 dan 1 (contoh: 0.08 = 8%)')
  }
}

// ─── TCAService_getTabData ────────────────────────────────────────────────────
/**
 * Ambil semua data untuk Tab Kategori di halaman Detail Tenant.
 */
export async function TCAService_getTabData(
  tenantId: string,
  filter?:  AssignmentFilter
): Promise<AssignmentTabData> {
  const [assignments, summary] = await Promise.all([
    findByTenantId(tenantId, filter),
    getSummaryByTenantId(tenantId),
  ])

  return { summary, assignments }
}

// ─── TCAService_assign ────────────────────────────────────────────────────────
/**
 * Assign satu kategori ke tenant via SP sp_assign_category_to_tenant.
 */
export async function TCAService_assign(
  payload:    AssignKategoriPayload,
  assignedBy: string
): Promise<{ assignment_id: string }> {
  validateCommissionOverride(payload.commission_override)

  const result = await assignViaSP(payload, assignedBy)
  if (!result.ok || !result.assignmentId) {
    throw new Error(result.error ?? 'Gagal assign kategori')
  }

  return { assignment_id: result.assignmentId }
}

// ─── TCAService_batchAssign ───────────────────────────────────────────────────
/**
 * Assign beberapa kategori sekaligus (dari dialog multi-select).
 * Gagal satu tidak membatalkan yang lain.
 */
export async function TCAService_batchAssign(
  payload:    BatchAssignPayload,
  assignedBy: string
): Promise<{ berhasil: string[]; gagal: Array<{ category_id: string; alasan: string }> }> {
  const berhasil: string[] = []
  const gagal: Array<{ category_id: string; alasan: string }> = []

  for (const item of payload.assignments) {
    try {
      const result = await TCAService_assign(
        {
          tenant_id:           payload.tenant_id,
          category_id:         item.category_id,
          commission_override: item.commission_override ?? null,
          coverage_areas:      item.coverage_areas ?? null,
          sla_minutes:         item.sla_minutes ?? null,
        },
        assignedBy
      )
      berhasil.push(result.assignment_id)
    } catch (err) {
      gagal.push({
        category_id: item.category_id,
        alasan:      err instanceof Error ? err.message : 'Gagal tidak diketahui',
      })
    }
  }

  return { berhasil, gagal }
}

// ─── TCAService_suspend ───────────────────────────────────────────────────────
/**
 * Tangguhkan sementara assignment kategori.
 */
export async function TCAService_suspend(
  assignmentId: string,
  payload:      SuspendAssignmentPayload,
  suspendedBy:  string
): Promise<void> {
  if (!payload.suspend_reason?.trim()) {
    throw new Error('Alasan penangguhan wajib diisi')
  }

  const assignment = await findById(assignmentId)
  if (!assignment) throw new Error('Assignment tidak ditemukan')
  if (assignment.status !== 'active') {
    throw new Error('Hanya assignment aktif yang bisa ditangguhkan')
  }

  const ok = await suspendAssignment(assignmentId, payload, suspendedBy)
  if (!ok) throw new Error('Gagal menangguhkan assignment')
}

// ─── TCAService_aktifkanKembali ───────────────────────────────────────────────
/**
 * Aktifkan kembali assignment yang ditangguhkan.
 */
export async function TCAService_aktifkanKembali(
  assignmentId:  string,
  reactivatedBy: string
): Promise<void> {
  const assignment = await findById(assignmentId)
  if (!assignment) throw new Error('Assignment tidak ditemukan')
  if (assignment.status !== 'suspended') {
    throw new Error('Hanya assignment yang ditangguhkan yang bisa diaktifkan kembali')
  }

  const ok = await aktivasiKembali(assignmentId, reactivatedBy)
  if (!ok) throw new Error('Gagal mengaktifkan kembali assignment')
}

// ─── TCAService_cabut ─────────────────────────────────────────────────────────
/**
 * Cabut penugasan kategori secara permanen via SP (soft delete).
 */
export async function TCAService_cabut(
  assignmentId: string,
  payload:      RevokeAssignmentPayload,
  revokedBy:    string
): Promise<void> {
  if (!payload.revoke_reason?.trim()) {
    throw new Error('Alasan pencabutan wajib diisi')
  }

  const assignment = await findById(assignmentId)
  if (!assignment) throw new Error('Assignment tidak ditemukan')
  if (assignment.deleted_at) throw new Error('Assignment sudah dicabut sebelumnya')

  const result = await revokeViaSP(assignmentId, payload, revokedBy)
  if (!result.ok) throw new Error(result.error ?? 'Gagal mencabut penugasan')
}

// ─── TCAService_handover ──────────────────────────────────────────────────────
/**
 * Inisiasi serah terima kategori ke tenant lain.
 */
export async function TCAService_handover(
  payload:     HandoverPayload,
  initiatedBy: string
): Promise<void> {
  const result = await initHandoverViaSP(
    payload.from_assignment_id,
    payload.to_tenant_id,
    initiatedBy
  )
  if (!result.ok) throw new Error(result.error ?? 'Gagal inisiasi handover')
}

// ─── TCAService_updateOverrideKomisi ─────────────────────────────────────────
/**
 * Update override komisi untuk satu assignment (inline edit di Tab Kategori).
 */
export async function TCAService_updateOverrideKomisi(
  assignmentId: string,
  payload:      UpdateOverridePayload,
  updatedBy:    string
): Promise<void> {
  validateCommissionOverride(payload.commission_override)

  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_category_assignments')
    .update({
      commission_override: payload.commission_override ?? null,
      coverage_areas:      payload.coverage_areas ?? undefined,
      sla_minutes:         payload.sla_minutes    ?? undefined,
      updated_by:          updatedBy,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .is('deleted_at', null)

  if (error) throw new Error('Gagal mengupdate override komisi')
}
