// lib/services/complaint.service.ts
// Service layer untuk M9 Approval Refund SuperAdmin — business logic + validasi.
// Dipakai oleh: API route handlers di app/api/superadmin/refunds/
//
// ARSITEKTUR:
//   RSC / API Route → ComplaintService_* (file ini)
//                  → complaintRepo_* (complaint.repository.ts)
//                  → DB (via SP sp_resolve_complaint_superadmin)
//
// 3 fungsi:
//   - ComplaintService_listRefunds    (list awaiting SuperAdmin approval)
//   - ComplaintService_getRefundDetail (detail satu complaint)
//   - ComplaintService_resolveRefund  (approve / reject dengan validasi)
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin

import 'server-only'
import {
  complaintRepo_findAwaitingSuperAdmin,
  complaintRepo_findById,
  complaintRepo_resolve,
} from '@/lib/repositories/complaint.repository'
import type {
  RefundListParams,
  RefundListResponse,
  ComplaintWithDetails,
  ApproveRefundPayload,
  RejectRefundPayload,
  ResolveComplaintSPResult,
} from '@/lib/types/complaint.types'

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * List complaints dengan status 'awaiting_super_admin'.
 * Dipakai untuk halaman list M9.
 */
export async function ComplaintService_listRefunds(
  params: RefundListParams
): Promise<RefundListResponse> {
  const page    = params.page     ?? 1
  const perPage = params.per_page ?? 20

  const { data, total } = await complaintRepo_findAwaitingSuperAdmin(params)

  return { data, total, page, per_page: perPage }
}

/**
 * Ambil detail satu complaint untuk review SuperAdmin.
 * Throw error jika tidak ditemukan atau tidak dalam status awaiting_super_admin.
 */
export async function ComplaintService_getRefundDetail(
  complaintId: string
): Promise<ComplaintWithDetails> {
  if (!complaintId || typeof complaintId !== 'string') {
    throw new Error('Complaint ID tidak valid')
  }

  const complaint = await complaintRepo_findById(complaintId)

  if (!complaint) {
    throw new Error(`Komplain dengan ID ${complaintId} tidak ditemukan`)
  }

  if (complaint.status !== 'awaiting_super_admin') {
    throw new Error(
      `Komplain ini tidak dalam status menunggu persetujuan SuperAdmin. Status saat ini: ${complaint.status}`
    )
  }

  return complaint
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Approve refund oleh SuperAdmin.
 * Memanggil SP sp_resolve_complaint_superadmin dengan action='approve'.
 * Throw error jika SP mengembalikan success=false.
 */
export async function ComplaintService_approveRefund(
  complaintId: string,
  payload:     ApproveRefundPayload,
  resolvedBy:  string
): Promise<ResolveComplaintSPResult> {
  if (!complaintId || !resolvedBy) {
    throw new Error('complaint_id dan resolved_by wajib diisi')
  }

  const result = await complaintRepo_resolve(
    complaintId,
    'approve',
    payload.resolution_notes ?? null,
    payload.refund_amount    ?? null,
    resolvedBy
  )

  if (!result.success) {
    throw new Error(result.message ?? 'Gagal menyetujui refund')
  }

  return result
}

/**
 * Reject refund oleh SuperAdmin.
 * Memanggil SP sp_resolve_complaint_superadmin dengan action='reject'.
 * Validasi: resolution_notes wajib diisi.
 * Throw error jika SP mengembalikan success=false.
 */
export async function ComplaintService_rejectRefund(
  complaintId: string,
  payload:     RejectRefundPayload,
  resolvedBy:  string
): Promise<ResolveComplaintSPResult> {
  if (!complaintId || !resolvedBy) {
    throw new Error('complaint_id dan resolved_by wajib diisi')
  }

  if (!payload.resolution_notes || payload.resolution_notes.trim() === '') {
    throw new Error('Alasan penolakan wajib diisi saat menolak refund')
  }

  const result = await complaintRepo_resolve(
    complaintId,
    'reject',
    payload.resolution_notes,
    null,
    resolvedBy
  )

  if (!result.success) {
    throw new Error(result.message ?? 'Gagal menolak refund')
  }

  return result
}
