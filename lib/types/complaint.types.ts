// lib/types/complaint.types.ts
// Tipe data untuk M9 Approval Refund SuperAdmin.
// Dipakai oleh: complaint.repository.ts, complaint.service.ts,
//               API routes M9, dan komponen UI M9.
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin

// ─── Status & Enum ───────────────────────────────────────────────────────────

export type ComplaintStatus =
  | 'open'
  | 'vendor_notified'
  | 'in_review'
  | 'awaiting_super_admin'
  | 'resolved'
  | 'rejected'

export type ComplaintType =
  | 'quality'
  | 'no_show'
  | 'incomplete_work'
  | 'overcharge'
  | 'behavior'
  | 'damage'
  | 'late'
  | 'other'

export type ResolutionType =
  | 'refund_full'
  | 'refund_partial'
  | 'redo_service'
  | 'warning_vendor'
  | 'no_action'
  | 'rejected'

export type ComplaintActorRole =
  | 'customer'
  | 'vendor'
  | 'admin_tenant'
  | 'super_admin'
  | 'system'

export type ComplaintActivityType =
  | 'message'
  | 'status_changed'
  | 'evidence_added'
  | 'vendor_notified'
  | 'escalated'
  | 'resolution_proposed'
  | 'resolved'
  | 'rejected'

export type SuperAdminAction = 'approve' | 'reject'

// ─── Complaint Core ───────────────────────────────────────────────────────────

/**
 * Satu baris dari tabel `complaints`.
 * Merepresentasikan satu kasus sengketa Customer–Vendor.
 */
export interface ComplaintRow {
  id:                    string
  order_id:              string
  tenant_scope_id:       string
  customer_user_id:      string
  vendor_profile_id:     string
  subject:               string
  description:           string
  complaint_type:        ComplaintType
  status:                ComplaintStatus
  resolution_type:       ResolutionType | null
  refund_amount:         number | null
  resolution_notes:      string | null
  resolved_by:           string | null
  vendor_notified_at:    string | null
  vendor_responded_at:   string | null
  response_deadline_at:  string | null
  resolution_deadline_at: string | null
  escalated_at:          string | null
  escalated_by:          string | null
  escalation_reason:     string | null
  super_admin_deadline_at: string | null
  created_at:            string
  updated_at:            string
  resolved_at:           string | null
}

// ─── Enriched Types ───────────────────────────────────────────────────────────

/**
 * Complaint dengan data join dari tenants dan user_profiles.
 * Dipakai untuk tampilan list M9 (tabel utama).
 * CATATAN: customer_user_id FK ke auth.users (bukan public.user_profiles)
 * → diambil via 2-query approach seperti M8.
 */
export interface ComplaintWithDetails extends ComplaintRow {
  tenant_nama:       string   // tenants.nama_brand
  tenant_tipe:       string   // tenants.tipe ('internal' | 'eksternal')
  customer_nama:     string   // user_profiles.nama (dari 2-query merge)
  customer_email:    string   // user_profiles.email
}

/**
 * Item ringkas untuk tabel list di halaman M9.
 * Hanya kolom yang tampil di tabel — tidak semua kolom complaint.
 */
export interface RefundListItem {
  id:                  string
  order_id:            string
  subject:             string
  complaint_type:      ComplaintType
  tenant_scope_id:     string
  tenant_nama:         string
  customer_nama:       string
  customer_email:      string
  refund_amount:       number | null
  escalated_at:        string | null
  super_admin_deadline_at: string | null
  escalation_reason:   string | null
  created_at:          string
}

// ─── Activity Types ───────────────────────────────────────────────────────────

/**
 * Satu baris dari tabel `complaint_activities`.
 * Timeline event dalam complaint — immutable (tidak ada updated_at).
 */
export interface ComplaintActivity {
  id:              string
  complaint_id:    string
  actor_role:      ComplaintActorRole
  actor_id:        string | null
  activity_type:   ComplaintActivityType
  content:         string | null
  evidence_ref_id: string | null
  metadata:        Record<string, unknown> | null
  is_internal:     boolean
  created_at:      string
}

// ─── Payload ──────────────────────────────────────────────────────────────────

/**
 * Payload untuk approve refund oleh SuperAdmin.
 * POST /api/superadmin/refunds/[id]/approve
 */
export interface ApproveRefundPayload {
  resolution_notes?: string   // catatan opsional saat approve
  refund_amount?:    number   // nominal refund (NULL = full refund)
}

/**
 * Payload untuk reject refund oleh SuperAdmin.
 * POST /api/superadmin/refunds/[id]/reject
 */
export interface RejectRefundPayload {
  resolution_notes: string    // WAJIB — alasan penolakan
}

/**
 * Response dari SP sp_resolve_complaint_superadmin.
 */
export interface ResolveComplaintSPResult {
  success:         boolean
  complaint_id?:   string
  action?:         SuperAdminAction
  resolution_type?: ResolutionType
  new_status?:     ComplaintStatus
  resolved_at?:    string
  error?:          string
  message?:        string
  current_status?: string
}

// ─── Query Params ─────────────────────────────────────────────────────────────

/**
 * Query params untuk GET /api/superadmin/refunds (list + filter + pagination).
 */
export interface RefundListParams {
  search?:     string   // cari by subject atau nama customer
  tenant_id?:  string
  page?:       number   // default 1
  per_page?:   number   // default 20
}

/**
 * Response pagination untuk list refunds M9.
 */
export interface RefundListResponse {
  data:     RefundListItem[]
  total:    number
  page:     number
  per_page: number
}
