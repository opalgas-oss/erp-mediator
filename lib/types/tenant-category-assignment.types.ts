// lib/types/tenant-category-assignment.types.ts
// Tipe data untuk M6 — entitas Assignment Kategori ke Tenant
// Dipakai oleh: tenant-category-assignment.repository.ts, .service.ts, Tab Kategori UI
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.2
// Update: Sesi #143 — tambah coverage_area_entries ke AssignKategoriPayload
// Update: Sesi #327 — F-02: tambah CoverageAreaDetail, hapus coverage_summary dari AssignmentSummary,
//                           bersihkan field legacy coverage_areas dari payload

import type { CategoryBreadcrumb } from './category.types'
import type { CoverageAreaPayload } from './province.types'

// ─── Literal Types ────────────────────────────────────────────────────────────

export type AssignmentStatus =
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'pending_handover'

// ─── Detail coverage area per assignment (dari junction table) ────────────────
// Dibuat S#327 F-02 — menggantikan field legacy coverage_areas TEXT[]

export interface CoverageAreaDetail {
  province_id:   string
  province_name: string
  city_id:       string | null   // NULL = semua kota di provinsi ini
  city_name:     string | null
}

// ─── Entitas: Assignment (full row DB) ────────────────────────────────────────

export interface TenantCategoryAssignment {
  id:                    string
  tenant_id:             string
  category_id:           string
  status:                AssignmentStatus
  commission_override:   string | null     // NUMERIC dari DB → string. NULL = ikut kontrak
  // coverage_areas TIDAK ada di sini — kolom legacy, selalu NULL, tidak dipakai
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
  deleted_at:            string | null     // NULL = aktif. NOT NULL = dicabut (soft delete)
  deleted_by:            string | null
  revoke_reason:         string | null
}

// ─── Assignment dengan Detail Kategori (untuk tabel Tab Kategori) ─────────────

export interface AssignmentDenganKategori extends TenantCategoryAssignment {
  kategori:              CategoryBreadcrumb   // nama + path breadcrumb
  // Tampilan komisi
  rate_kontrak:          string | null        // rate dari kontrak tenant (% string)
  tampil_komisi:         string               // "Ikut kontrak (X%)" atau "Override: Y%"
  // Coverage area aktual dari junction table assignment_coverage_areas (S#327 F-02)
  coverage_areas_detail: CoverageAreaDetail[] // kosong = Seluruh Indonesia
}

// ─── Summary Row (2 kartu di atas tabel Tab Kategori) ────────────────────────
// S#327 F-02: coverage_summary dihapus — card Coverage Area dihapus dari UI (keputusan Philips)

export interface AssignmentSummary {
  total_aktif:           number
  total_override_komisi: number   // yang punya commission_override != null
}

// ─── Payload: Assign Kategori ke Tenant (dari Dialog Assign) ──────────────────

export interface AssignKategoriPayload {
  tenant_id:             string
  category_id:           string
  commission_override:   number | null  // NULL = ikut kontrak
  // coverage_areas dihapus S#327 F-02 — field legacy, tidak dipakai
  sla_minutes:           number | null
  // Junction table coverage areas (Provinsi + Kota) — S#143
  coverage_area_entries?: CoverageAreaPayload[]
}

// ─── Payload: Batch Assign (kirim beberapa sekaligus) ────────────────────────

export interface BatchAssignPayload {
  tenant_id:             string
  assignments:           Omit<AssignKategoriPayload, 'tenant_id'>[]
}

// ─── Payload: Update Override Komisi ──────────────────────────────────────────

export interface UpdateOverridePayload {
  commission_override:   number | null  // NULL = reset ke ikut kontrak
  // coverage_areas dihapus S#327 F-02 — field legacy, tidak dipakai
  sla_minutes?:          number | null
}

// ─── Payload: Tangguhkan Sementara ────────────────────────────────────────────

export interface SuspendAssignmentPayload {
  suspend_reason: string
}

// ─── Payload: Cabut Penugasan (konfirmasi 2-step) ─────────────────────────────

export interface RevokeAssignmentPayload {
  revoke_reason:            string
  konfirmasi_nama_kategori: string  // user mengetik nama kategori untuk konfirmasi
}

// ─── Payload: Inisiasi Handover ───────────────────────────────────────────────

export interface HandoverPayload {
  from_assignment_id: string
  to_tenant_id:       string
}

// ─── Filter: Tab Kategori Detail Tenant ───────────────────────────────────────

export interface AssignmentFilter {
  status?:  AssignmentStatus | 'all'
  search?:  string
}

// ─── Response: Tab Kategori ────────────────────────────────────────────────────

export interface AssignmentTabData {
  summary:     AssignmentSummary
  assignments: AssignmentDenganKategori[]
}
