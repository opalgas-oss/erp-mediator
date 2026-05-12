// ARSIP PRE-S138 — complaint.repository.ts
// Disalin: Sesi #138 — sebelum fix BUG: tenants FK join gagal (no FK constraint)
// Original path: lib/repositories/complaint.repository.ts
// Bug: query menggunakan tenants!complaints_tenant_scope_id_fkey yang tidak ada
//      sebagai FK constraint di DB. PostgREST gagal resolve join.

// lib/repositories/complaint.repository.ts
// Repository untuk entitas complaints — akses DB langsung.
// Dipakai oleh: complaint.service.ts
//
// 3 fungsi:
//   - complaintRepo_findAwaitingSuperAdmin  (list dengan filter + pagination)
//   - complaintRepo_findById               (detail satu complaint)
//   - complaintRepo_resolve                (panggil SP approve/reject)
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin
//
// ⚠ AREA RAWAN: complaints.customer_user_id FK ke auth.users (bukan public.user_profiles)
//   Supabase SDK tidak bisa auto-join cross-schema.
//   Solusi: 2-query approach (pola M8) — query complaints + tenants dulu,
//           lalu query user_profiles by id, merge manual.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  ComplaintRow,
  ComplaintWithDetails,
  RefundListItem,
  RefundListParams,
  ResolveComplaintSPResult,
  SuperAdminAction,
} from '@/lib/types/complaint.types'

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Ambil daftar complaints dengan status 'awaiting_super_admin'.
 * Dipakai untuk halaman list M9.
 *
 * Pendekatan 2-query (pola M8):
 * Q1: complaints JOIN tenants (ada FK public) — pagination + filter DB
 * Q2: user_profiles WHERE id IN (customer_user_id dari Q1)
 * Merge manual via profileMap.
 */
export async function complaintRepo_findAwaitingSuperAdmin(
  params: RefundListParams
): Promise<{ data: RefundListItem[]; total: number }> {
  const db = createServerSupabaseClient()

  const page     = params.page     ?? 1
  const per_page = params.per_page ?? 20
  const offset   = (page - 1) * per_page

  // ── Query 1: complaints + tenants ─────────────────────────────────────────
  type RawRow = {
    id:                      string
    order_id:                string
    customer_user_id:        string
    tenant_scope_id:         string
    subject:                 string
    complaint_type:          string
    refund_amount:           number | null
    escalated_at:            string | null
    super_admin_deadline_at: string | null
    escalation_reason:       string | null
    created_at:              string
    tenants:                 { nama_brand: string; tipe: string }
  }

  let q1 = db
    .from('complaints')
    .select(
      `id, order_id, customer_user_id, tenant_scope_id,
       subject, complaint_type, refund_amount,
       escalated_at, super_admin_deadline_at, escalation_reason,
       created_at,
       tenants!complaints_tenant_scope_id_fkey(nama_brand, tipe)`,
      { count: 'exact' }
    )
    .eq('status', 'awaiting_super_admin')
    .order('escalated_at', { ascending: true })
    .range(offset, offset + per_page - 1)

  if (params.tenant_id) q1 = q1.eq('tenant_scope_id', params.tenant_id)

  const { data: rawData, error: q1Error, count } = await q1
  if (q1Error) throw new Error(`[complaint.repository] findAwaitingSuperAdmin q1: ${q1Error.message}`)

  const rows = (rawData ?? []) as unknown as RawRow[]

  // ── Query 2: user_profiles untuk customer_user_id ─────────────────────────
  const customerIds = [...new Set(rows.map(r => r.customer_user_id))]
  type ProfileRow = { id: string; nama: string; email: string }
  let profileMap: Record<string, ProfileRow> = {}

  if (customerIds.length > 0) {
    const { data: profiles, error: q2Error } = await db
      .from('user_profiles')
      .select('id, nama, email')
      .in('id', customerIds)

    if (q2Error) throw new Error(`[complaint.repository] findAwaitingSuperAdmin q2: ${q2Error.message}`)

    profileMap = Object.fromEntries(
      ((profiles ?? []) as unknown as ProfileRow[]).map(p => [p.id, p])
    )
  }

  // ── Merge ──────────────────────────────────────────────────────────────────
  let items: RefundListItem[] = rows.map(row => ({
    id:                      row.id,
    order_id:                row.order_id,
    subject:                 row.subject,
    complaint_type:          row.complaint_type as RefundListItem['complaint_type'],
    tenant_scope_id:         row.tenant_scope_id,
    tenant_nama:             (row.tenants as { nama_brand: string })?.nama_brand ?? '',
    customer_nama:           profileMap[row.customer_user_id]?.nama  ?? '',
    customer_email:          profileMap[row.customer_user_id]?.email ?? '',
    refund_amount:           row.refund_amount,
    escalated_at:            row.escalated_at,
    super_admin_deadline_at: row.super_admin_deadline_at,
    escalation_reason:       row.escalation_reason,
    created_at:              row.created_at,
  }))

  if (params.search) {
    const q = params.search.toLowerCase()
    items = items.filter(
      i => i.subject.toLowerCase().includes(q) ||
           i.customer_nama.toLowerCase().includes(q) ||
           i.customer_email.toLowerCase().includes(q)
    )
  }

  return { data: items, total: count ?? 0 }
}

export async function complaintRepo_findById(
  complaintId: string
): Promise<ComplaintWithDetails | null> {
  const db = createServerSupabaseClient()

  type RawDetail = ComplaintRow & {
    tenants: { nama_brand: string; tipe: string }
  }

  const { data: rawComplaint, error: q1Error } = await db
    .from('complaints')
    .select(`*, tenants!complaints_tenant_scope_id_fkey(nama_brand, tipe)`)
    .eq('id', complaintId)
    .maybeSingle()

  if (q1Error) throw new Error(`[complaint.repository] findById q1: ${q1Error.message}`)
  if (!rawComplaint) return null

  const raw = rawComplaint as unknown as RawDetail

  type ProfileRow = { id: string; nama: string; email: string }
  const { data: profile, error: q2Error } = await db
    .from('user_profiles')
    .select('id, nama, email')
    .eq('id', raw.customer_user_id)
    .maybeSingle()

  if (q2Error) throw new Error(`[complaint.repository] findById q2: ${q2Error.message}`)

  const p = profile as ProfileRow | null

  return {
    ...raw,
    resolution_type:  raw.resolution_type  as ComplaintWithDetails['resolution_type'],
    complaint_type:   raw.complaint_type   as ComplaintWithDetails['complaint_type'],
    status:           raw.status           as ComplaintWithDetails['status'],
    tenant_nama:      raw.tenants?.nama_brand ?? '',
    tenant_tipe:      raw.tenants?.tipe        ?? '',
    customer_nama:    p?.nama  ?? '',
    customer_email:   p?.email ?? '',
  }
}

export async function complaintRepo_resolve(
  complaintId: string,
  action:       SuperAdminAction,
  notes:        string | null,
  refundAmount: number | null,
  resolvedBy:   string
): Promise<ResolveComplaintSPResult> {
  const db = createServerSupabaseClient()

  const { data, error } = await db.rpc('sp_resolve_complaint_superadmin', {
    p_complaint_id:     complaintId,
    p_action:           action,
    p_resolution_notes: notes,
    p_refund_amount:    refundAmount,
    p_resolved_by:      resolvedBy,
  })

  if (error) throw new Error(`[complaint.repository] resolve SP: ${error.message}`)

  return data as ResolveComplaintSPResult
}
