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
// Fix S#138: Ubah ke 3-query approach — complaints tidak punya FK constraint ke tenants.
//            PostgREST tidak bisa join tanpa FK constraint aktual.
//            Solusi: query complaints, query tenants by tenant_scope_id, query user_profiles,
//            merge manual. (sama dengan pola M8 untuk cross-schema join)
//
// ⚠ AREA RAWAN: complaints.customer_user_id FK ke auth.users (bukan public.user_profiles)
//   Supabase SDK tidak bisa auto-join cross-schema.
//   Solusi: multi-query approach — query complaints dulu, lalu tenants + user_profiles,
//           merge manual via tenantMap + profileMap.

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
 * Pendekatan 3-query (pola M8 — tidak ada FK constraint di complaints):
 * Q1: complaints saja (pagination + filter) — count exact
 * Q2: tenants WHERE id IN (tenant_scope_id dari Q1)
 * Q3: user_profiles WHERE id IN (customer_user_id dari Q1)
 * Merge manual via tenantMap + profileMap.
 */
export async function complaintRepo_findAwaitingSuperAdmin(
  params: RefundListParams
): Promise<{ data: RefundListItem[]; total: number }> {
  const db = createServerSupabaseClient()

  const page     = params.page     ?? 1
  const per_page = params.per_page ?? 20
  const offset   = (page - 1) * per_page

  // ── Query 1: complaints saja — pagination + count ─────────────────────────
  type RawComplaint = {
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
  }

  let q1 = db
    .from('complaints')
    .select(
      `id, order_id, customer_user_id, tenant_scope_id,
       subject, complaint_type, refund_amount,
       escalated_at, super_admin_deadline_at, escalation_reason,
       created_at`,
      { count: 'exact' }
    )
    .eq('status', 'awaiting_super_admin')
    .order('escalated_at', { ascending: true })   // terlama eskalasi → prioritas atas
    .range(offset, offset + per_page - 1)

  if (params.tenant_id) q1 = q1.eq('tenant_scope_id', params.tenant_id)

  const { data: rawComplaints, error: q1Error, count } = await q1
  if (q1Error) throw new Error(`[complaint.repository] findAwaitingSuperAdmin q1: ${q1Error.message}`)

  const complaints = (rawComplaints ?? []) as unknown as RawComplaint[]
  if (complaints.length === 0) return { data: [], total: count ?? 0 }

  // ── Query 2: tenants by tenant_scope_id ───────────────────────────────────
  const tenantIds = [...new Set(complaints.map(c => c.tenant_scope_id))]
  type TenantRow = { id: string; nama_brand: string; tipe: string | null }
  let tenantMap: Record<string, TenantRow> = {}

  if (tenantIds.length > 0) {
    const { data: tenants, error: q2Error } = await db
      .from('tenants')
      .select('id, nama_brand, tipe')
      .in('id', tenantIds)

    if (q2Error) throw new Error(`[complaint.repository] findAwaitingSuperAdmin q2: ${q2Error.message}`)

    tenantMap = Object.fromEntries(
      ((tenants ?? []) as unknown as TenantRow[]).map(t => [t.id, t])
    )
  }

  // ── Query 3: user_profiles by customer_user_id ────────────────────────────
  const customerIds = [...new Set(complaints.map(c => c.customer_user_id))]
  type ProfileRow = { id: string; nama: string; email: string }
  let profileMap: Record<string, ProfileRow> = {}

  if (customerIds.length > 0) {
    const { data: profiles, error: q3Error } = await db
      .from('user_profiles')
      .select('id, nama, email')
      .in('id', customerIds)

    if (q3Error) throw new Error(`[complaint.repository] findAwaitingSuperAdmin q3: ${q3Error.message}`)

    profileMap = Object.fromEntries(
      ((profiles ?? []) as unknown as ProfileRow[]).map(p => [p.id, p])
    )
  }

  // ── Merge ──────────────────────────────────────────────────────────────────
  let items: RefundListItem[] = complaints.map(row => ({
    id:                      row.id,
    order_id:                row.order_id,
    subject:                 row.subject,
    complaint_type:          row.complaint_type as RefundListItem['complaint_type'],
    tenant_scope_id:         row.tenant_scope_id,
    tenant_nama:             tenantMap[row.tenant_scope_id]?.nama_brand ?? '',
    customer_nama:           profileMap[row.customer_user_id]?.nama     ?? '',
    customer_email:          profileMap[row.customer_user_id]?.email    ?? '',
    refund_amount:           row.refund_amount,
    escalated_at:            row.escalated_at,
    super_admin_deadline_at: row.super_admin_deadline_at,
    escalation_reason:       row.escalation_reason,
    created_at:              row.created_at,
  }))

  // Search post-merge (subject atau nama customer)
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

/**
 * Ambil detail satu complaint berdasarkan id.
 * Dipakai untuk verifikasi sebelum approve/reject.
 * Return null jika tidak ditemukan.
 *
 * Pendekatan 3-query (sama dengan findAwaitingSuperAdmin):
 * Q1: complaint saja
 * Q2: tenant by tenant_scope_id
 * Q3: user_profiles by customer_user_id
 */
export async function complaintRepo_findById(
  complaintId: string
): Promise<ComplaintWithDetails | null> {
  const db = createServerSupabaseClient()

  // ── Query 1: complaint saja ───────────────────────────────────────────────
  const { data: rawComplaint, error: q1Error } = await db
    .from('complaints')
    .select('*')
    .eq('id', complaintId)
    .maybeSingle()

  if (q1Error) throw new Error(`[complaint.repository] findById q1: ${q1Error.message}`)
  if (!rawComplaint) return null

  const raw = rawComplaint as unknown as ComplaintRow

  // ── Query 2: tenant by tenant_scope_id ───────────────────────────────────
  type TenantRow = { id: string; nama_brand: string; tipe: string | null }
  const { data: tenantData, error: q2Error } = await db
    .from('tenants')
    .select('id, nama_brand, tipe')
    .eq('id', raw.tenant_scope_id)
    .maybeSingle()

  if (q2Error) throw new Error(`[complaint.repository] findById q2: ${q2Error.message}`)
  const tenant = tenantData as TenantRow | null

  // ── Query 3: user_profiles untuk customer ─────────────────────────────────
  type ProfileRow = { id: string; nama: string; email: string }
  const { data: profile, error: q3Error } = await db
    .from('user_profiles')
    .select('id, nama, email')
    .eq('id', raw.customer_user_id)
    .maybeSingle()

  if (q3Error) throw new Error(`[complaint.repository] findById q3: ${q3Error.message}`)
  const p = profile as ProfileRow | null

  return {
    ...raw,
    resolution_type:  raw.resolution_type  as ComplaintWithDetails['resolution_type'],
    complaint_type:   raw.complaint_type   as ComplaintWithDetails['complaint_type'],
    status:           raw.status           as ComplaintWithDetails['status'],
    tenant_nama:      tenant?.nama_brand ?? '',
    tenant_tipe:      tenant?.tipe        ?? '',
    customer_nama:    p?.nama  ?? '',
    customer_email:   p?.email ?? '',
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Panggil SP sp_resolve_complaint_superadmin.
 * Atomic: UPDATE complaints + INSERT complaint_activities.
 *
 * @param complaintId - ID complaint yang akan diputuskan
 * @param action      - 'approve' atau 'reject'
 * @param notes       - Catatan keputusan (wajib saat reject)
 * @param refundAmount - Nominal refund opsional (NULL = full refund)
 * @param resolvedBy  - auth.users uid SuperAdmin yang memutuskan
 */
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
