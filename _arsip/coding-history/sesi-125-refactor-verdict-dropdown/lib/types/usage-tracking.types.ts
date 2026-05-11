// ARSIP — usage-tracking.types.ts sebelum S#125 refactor verdict layer
// Snapshot: 11 Mei 2026 — sebelum tambah SafetyStatusFullMap
// lib/types/usage-tracking.types.ts
// Type definitions untuk sistem USAGE_TRACKING — Pemetaan Pemakaian.
// Berisi semua type yang dipakai oleh repository, service, API route,
// dan komponen UI UsageTrackingPanel.
//
// Dibuat: Sesi #121 — PL-S12 Shared UI + API Routes USAGE_TRACKING

// ─── Enum / Literal Types ─────────────────────────────────────────────────────

/** Status lifecycle dependency — nilai DB di registry_dependencies */
export type LifecycleStatus =
  | 'RENCANA'       // Didaftarkan, modul belum dibangun
  | 'DIBANGUN'      // Ada di kode, belum ada data user
  | 'AKTIF'         // Sedang dipakai user (ada data nyata)
  | 'TIDAK_DIPAKAI' // Disembunyikan dari pilihan baru, data lama aman

/** Safety verdict dari sp_check_usage — menentukan boleh tidaknya item dihapus */
export type SafetyVerdict =
  | 'AMAN'       // Tidak ada dependency aktif — aman dihapus
  | 'TIDAK_BISA' // Ada dependency DIBANGUN (ada di kode) — berisiko
  | 'TIDAK_AMAN' // Ada dependency AKTIF (dipakai user) — berbahaya

/** Tipe referensi dependency */
export type ReferenceType = 'fk' | 'value' | 'enum'

// ─── sp_check_usage Output ───────────────────────────────────────────────────

/** Satu item dependency dalam daftar hasil sp_check_usage */
export interface DependencyItem {
  id:               string
  module_name:      string
  lifecycle_status: LifecycleStatus
  consumer_table:   string
  consumer_column:  string
  description:      string | null
}

/** Breakdown jumlah dependency per status lifecycle */
export interface CheckUsageBreakdown {
  RENCANA:       number
  DIBANGUN:      number
  AKTIF:         number
  TIDAK_DIPAKAI: number
}

export interface CheckUsageResult {
  safety_verdict:   SafetyVerdict
  total_dependency: number
  breakdown:        CheckUsageBreakdown
  dependencies:     DependencyItem[]
}

export interface RegisterDependencyPayload {
  source_table:        string
  source_id?:          string
  consumer_module_id:  string
  consumer_table:      string
  consumer_column:     string
  reference_type:      ReferenceType
  lifecycle_status?:   LifecycleStatus
  description?:        string
}

export interface RegisterDependencyResult {
  status:  'OK' | 'DUPLICATE' | 'ERROR'
  id:      string | null
  message: string
}

export interface UpdateDependencyStatusPayload {
  new_status: LifecycleStatus
}

export interface UpdateDependencyStatusResult {
  status:     'OK' | 'NO_CHANGE' | 'ERROR'
  id:         string
  old_status: string
  new_status: string
  message:    string
}

export interface CheckUsageApiResponse {
  success: boolean
  data?:   CheckUsageResult
  message?: string
}

export interface RegisterDependencyApiResponse {
  success: boolean
  data?:   RegisterDependencyResult
  message?: string
}

export interface UpdateStatusApiResponse {
  success: boolean
  data?:   UpdateDependencyStatusResult
  message?: string
}

export interface SafetyStatusResult {
  source_table:         string
  source_id:            string | null
  safety_verdict:       SafetyVerdict
  count_aktif:          number
  count_dibangun:       number
  count_rencana:        number
  count_tidak_dipakai:  number
  total_dependency:     number
  last_recalculated_at: string
}

export type SafetyStatusMap = Record<string, SafetyVerdict>

export interface SafetyStatusApiResponse {
  success: boolean
  data?:   SafetyStatusResult[]
  message?: string
}
