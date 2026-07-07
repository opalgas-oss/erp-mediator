// ARSIP S#327 — pra-fix coverage area
// Original: lib/types/tenant-category-assignment.types.ts
// lib/types/tenant-category-assignment.types.ts
// Tipe data untuk M6 — entitas Assignment Kategori ke Tenant
// Dipakai oleh: tenant-category-assignment.repository.ts, .service.ts, Tab Kategori UI
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.2
// Update: Sesi #143 — tambah coverage_area_entries ke AssignKategoriPayload

import type { CategoryBreadcrumb } from './category.types'
import type { CoverageAreaPayload } from './province.types'

export type AssignmentStatus =
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'pending_handover'

export interface TenantCategoryAssignment {
  id:                    string
  tenant_id:             string
  category_id:           string
  status:                AssignmentStatus
  commission_override:   string | null
  coverage_areas:        string[] | null   // LEGACY DEPRECATED S#327
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
  kategori:      CategoryBreadcrumb
  rate_kontrak:  string | null
  tampil_komisi: string
}

export interface AssignmentSummary {
  total_aktif:           number
  total_override_komisi: number
  coverage_summary:      string  // LEGACY — akan dihapus S#327
}

export interface AssignKategoriPayload {
  tenant_id:             string
  category_id:           string
  commission_override:   number | null
  coverage_areas:        string[] | null  // LEGACY
  sla_minutes:           number | null
  coverage_area_entries?: CoverageAreaPayload[]
}

export interface BatchAssignPayload {
  tenant_id:   string
  assignments: Omit<AssignKategoriPayload, 'tenant_id'>[]
}

export interface UpdateOverridePayload {
  commission_override: number | null
  coverage_areas?:     string[] | null  // LEGACY
  sla_minutes?:        number | null
}

export interface SuspendAssignmentPayload { suspend_reason: string }
export interface RevokeAssignmentPayload  { revoke_reason: string; konfirmasi_nama_kategori: string }
export interface HandoverPayload          { from_assignment_id: string; to_tenant_id: string }
export interface AssignmentFilter         { status?: AssignmentStatus | 'all'; search?: string }
export interface AssignmentTabData        { summary: AssignmentSummary; assignments: AssignmentDenganKategori[] }
