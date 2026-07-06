// lib/types/tenant-category-assignment.types.ts
// ARSIP SESI #325 — sebelum tambah 'revoked' ke AssignmentStatus
// Alasan: TypeScript strict error di tab-kategori.tabel.tsx:32
//   Type '"revoked"' tidak overlap dengan AssignmentStatus
//   (revoked memang ada di DB sebagai soft-delete status)

import type { CategoryBreadcrumb } from './category.types'
import type { CoverageAreaPayload } from './province.types'

export type AssignmentStatus =
  | 'active'
  | 'suspended'
  | 'pending_handover'

export interface TenantCategoryAssignment {
  id:                    string
  tenant_id:             string
  category_id:           string
  status:                AssignmentStatus
  commission_override:   string | null
  coverage_areas:        string[] | null
  sla_minutes:           number | null
  assigned_by:           string | null
  assigned_at:           string
  suspended_by:          string | null
  suspended_at:          string | null
  suspend_reason:        string | null
  handover_to_tenant_id: string | null
  handover_initiated_at: string | null
  handover_initiated_by: string | null
  created_at:            string
  created_by:            string | null
  updated_at:            string
  updated_by:            string | null
  deleted_at:            string | null
  deleted_by:            string | null
  revoke_reason:         string | null
}

export interface AssignmentDenganKategori extends TenantCategoryAssignment {
  kategori: CategoryBreadcrumb
  rate_kontrak:          string | null
  tampil_komisi:         string
}

export interface AssignmentSummary {
  total_aktif:           number
  total_override_komisi: number
  coverage_summary:      string
}

export interface AssignKategoriPayload {
  tenant_id:             string
  category_id:           string
  commission_override:   number | null
  coverage_areas:        string[] | null
  sla_minutes:           number | null
  coverage_area_entries?: CoverageAreaPayload[]
}

export interface BatchAssignPayload {
  tenant_id:             string
  assignments:           Omit<AssignKategoriPayload, 'tenant_id'>[]
}

export interface UpdateOverridePayload {
  commission_override:   number | null
  coverage_areas?:       string[] | null
  sla_minutes?:          number | null
}

export interface SuspendAssignmentPayload {
  suspend_reason: string
}

export interface RevokeAssignmentPayload {
  revoke_reason:          string
  konfirmasi_nama_kategori: string
}

export interface HandoverPayload {
  from_assignment_id:   string
  to_tenant_id:         string
}

export interface AssignmentFilter {
  status?:   AssignmentStatus | 'all'
  search?:   string
}

export interface AssignmentTabData {
  summary:     AssignmentSummary
  assignments: AssignmentDenganKategori[]
}
