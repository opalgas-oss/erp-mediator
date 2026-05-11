// lib/types/usage-tracking.types.ts
// Type definitions untuk sistem USAGE_TRACKING — Pemetaan Pemakaian.
// Berisi semua type yang dipakai oleh repository, service, API route,
// dan komponen UI UsageTrackingPanel.
//
// Dibuat: Sesi #121 — PL-S12 Shared UI + API Routes USAGE_TRACKING
// Update: Sesi #125 — tambah SafetyStatusFullMap untuk verdict layer refactor

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
  /** UUID row registry_dependencies — ditambah S#123 untuk T4/T5 action buttons */
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

/**
 * Output lengkap dari sp_check_usage.
 * Dipakai oleh panel "Pemetaan Pemakaian" untuk tampilkan safety verdict
 * dan daftar modul yang memakai item ini.
 */
export interface CheckUsageResult {
  safety_verdict:   SafetyVerdict
  total_dependency: number
  breakdown:        CheckUsageBreakdown
  dependencies:     DependencyItem[]
}

// ─── sp_register_dependency Input + Output ───────────────────────────────────

/** Payload untuk daftarkan dependency baru via sp_register_dependency */
export interface RegisterDependencyPayload {
  source_table:        string          // tabel yang menyimpan item setting
  source_id?:          string          // UUID item spesifik (opsional — NULL = table-level)
  consumer_module_id:  string          // UUID FK ke platform_modules.id
  consumer_table:      string          // tabel yang memakai item ini
  consumer_column:     string          // kolom yang menyimpan referensi
  reference_type:      ReferenceType   // fk / value / enum
  lifecycle_status?:   LifecycleStatus // default: RENCANA jika tidak diisi
  description?:        string          // penjelasan natural language untuk Philips
}

/** Output dari sp_register_dependency */
export interface RegisterDependencyResult {
  status:  'OK' | 'DUPLICATE' | 'ERROR'
  id:      string | null
  message: string
}

// ─── sp_update_dependency_status Input + Output ──────────────────────────────

/** Payload untuk ubah lifecycle status via sp_update_dependency_status */
export interface UpdateDependencyStatusPayload {
  new_status: LifecycleStatus
}

/** Output dari sp_update_dependency_status */
export interface UpdateDependencyStatusResult {
  status:     'OK' | 'NO_CHANGE' | 'ERROR'
  id:         string
  old_status: string
  new_status: string
  message:    string
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

/** Response standar GET /api/superadmin/usage/check */
export interface CheckUsageApiResponse {
  success: boolean
  data?:   CheckUsageResult
  message?: string
}

/** Response standar POST /api/superadmin/usage/register */
export interface RegisterDependencyApiResponse {
  success: boolean
  data?:   RegisterDependencyResult
  message?: string
}

/** Response standar PATCH /api/superadmin/usage/[id]/status */
export interface UpdateStatusApiResponse {
  success: boolean
  data?:   UpdateDependencyStatusResult
  message?: string
}

// ─── registry_safety_status (BARU S#124) ──────────────────────────────────

/**
 * Satu row dari tabel cache `registry_safety_status`.
 * Dipakai UI untuk menentukan tombol Hapus enabled/disabled per item.
 * Items dengan 0 dep tidak ada di tabel — default AMAN.
 */
export interface SafetyStatusResult {
  source_table:         string
  source_id:            string | null  // null = table-level
  safety_verdict:       SafetyVerdict
  count_aktif:          number
  count_dibangun:       number
  count_rencana:        number
  count_tidak_dipakai:  number
  total_dependency:     number
  last_recalculated_at: string
}

/**
 * Map source_id → SafetyVerdict untuk lookup O(1) per item di UI.
 * Item tidak ada di map = 0 dep = AMAN secara implisit.
 * @deprecated Gunakan SafetyStatusFullMap untuk verdict layer baru (S#125)
 */
export type SafetyStatusMap = Record<string, SafetyVerdict>

/**
 * Map `${source_table}:${source_id}` → SafetyStatusResult (data lengkap).
 * Dipakai oleh useDeletePermission hook dan komponen yang consume verdict layer.
 * Kunci: `master_dropdown_options:${optionId}` atau `master_dropdown_groups:${groupId}`.
 * Item tidak ada di map = 0 dep = getOptionVerdict/getGroupVerdict akan treat sebagai AMAN.
 * Dibuat: S#125 — verdict layer refactor (RENCANA_REFACTOR_DROPDOWN_v1.md)
 */
export type SafetyStatusFullMap = Record<string, SafetyStatusResult>

/** Response standar GET /api/superadmin/usage/safety-status */
export interface SafetyStatusApiResponse {
  success: boolean
  data?:   SafetyStatusResult[]
  message?: string
}
