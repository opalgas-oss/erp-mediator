// lib/types/tenant-category-assignment.types.ts
// Tipe data untuk M6 — entitas Assignment Kategori ke Tenant
// Dipakai oleh: tenant-category-assignment.repository.ts, .service.ts, Tab Kategori UI
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.2
// Update: Sesi #143 — tambah coverage_area_entries ke AssignKategoriPayload

import type { CategoryBreadcrumb } from './category.types'
import type { CoverageAreaPayload } from './province.types'

// ─── Literal Types ────────────────────────────────────────────────────────────

export type AssignmentStatus =
  | 'active'
  | 'suspended'
  | 'pending_handover'

// ─── Entitas: Assignment (full row DB) ────────────────────────────────────────

export interface TenantCategoryAssignment {
  id:                    string
  tenant_id:             string
  category_id:           string
  status:                AssignmentStatus
  commission_override:   string | null     // NUMERIC dari DB → string. NULL = ikut kontrak
  coverage_areas:        string[] | null   // NULL = seluruh Indonesia
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
  kategori: CategoryBreadcrumb          // nama + path breadcrumb
  // Tampilan komisi
  rate_kontrak:          string | null  // rate dari kontrak tenant (% string)
  tampil_komisi:         string         // "Ikut kontrak (X%)" atau "Override: Y%"
}

// ─── Summary Row (3 kartu di atas tabel Tab Kategori) ────────────────────────

export interface AssignmentSummary {
  total_aktif:           number
  total_override_komisi: number         // yang punya commission_override != null
  coverage_summary:      string         // "Seluruh Indonesia" atau "Jawa, Bali, ..."
}

// ─── Payload: Assign Kategori ke Tenant (dari Dialog Assign) ──────────────────

export interface AssignKategoriPayload {
  tenant_id:             string
  category_id:           string
  commission_override:   number | null  // NULL = ikut kontrak
  coverage_areas:        string[] | null  // Legacy: backward compat, akan diisi dari entries
  sla_minutes:           number | null
  // Baru S#143: junction table coverage areas (Provinsi + Kota)
  coverage_area_entries?: CoverageAreaPayload[]
}

// ─── Payload: Batch Assign (kirim beberapa sekaligus) ────────────────────────

export interface BatchAssignPayload {
  tenant_id:             string
  assignments:           Omit<AssignKategoriPayload, 'tenant_id'>[]
  // Setting default berlaku untuk semua item dalam batch
  // (bisa di-override per item jika assignment[] mengisi field masing-masing)
}

// ─── Payload: Update Override Komisi ──────────────────────────────────────────

export interface UpdateOverridePayload {
  commission_override:   number | null  // NULL = reset ke ikut kontrak
  coverage_areas?:       string[] | null
  sla_minutes?:          number | null
}

// ─── Payload: Tangguhkan Sementara ────────────────────────────────────────────

export interface SuspendAssignmentPayload {
  suspend_reason: string
}

// ─── Payload: Cabut Penugasan (konfirmasi 2-step) ─────────────────────────────

export interface RevokeAssignmentPayload {
  revoke_reason:          string
  konfirmasi_nama_kategori: string     // user mengetik nama kategori untuk konfirmasi
}

// ─── Payload: Inisiasi Handover ───────────────────────────────────────────────

export interface HandoverPayload {
  from_assignment_id:   string
  to_tenant_id:         string
}

// ─── Filter: Tab Kategori Detail Tenant ───────────────────────────────────────

export interface AssignmentFilter {
  status?:   AssignmentStatus | 'all'
  search?:   string
}

// ─── Response: Tab Kategori ────────────────────────────────────────────────────

export interface AssignmentTabData {
  summary:     AssignmentSummary
  assignments: AssignmentDenganKategori[]
}
