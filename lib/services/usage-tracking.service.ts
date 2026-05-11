// lib/services/usage-tracking.service.ts
// Service untuk USAGE_TRACKING — delegasi ke repository, tanpa duplikasi business logic.
// Business logic utama sudah ada di SP (sp_check_usage, sp_register_dependency,
// sp_update_dependency_status). Service layer hanya menjadi jembatan yang bersih.
//
// 3 fungsi:
//   - UsageTrackingService_checkUsage       : cek pemakaian item
//   - UsageTrackingService_registerDependency: daftarkan dependency baru
//   - UsageTrackingService_updateStatus     : ubah lifecycle status
//
// Naming: PascalCase prefix per pola M4 (CODING_RULES_NAMING BAB 4).
//
// Dibuat: Sesi #121 — PL-S12 Shared UI + API Routes USAGE_TRACKING

import 'server-only'
import {
  usageRepo_checkUsage,
  usageRepo_registerDependency,
  usageRepo_updateStatus,
  usageRepo_getSafetyStatusBulk,
  usageRepo_getSafetyStatusSingle,
} from '@/lib/repositories/usage-tracking.repository'
import type {
  CheckUsageResult,
  RegisterDependencyPayload,
  RegisterDependencyResult,
  UpdateDependencyStatusResult,
  LifecycleStatus,
  SafetyStatusResult,
  SafetyVerdict,
} from '@/lib/types/usage-tracking.types'

// ─── Check Usage ──────────────────────────────────────────────────────────────

/**
 * Ambil info pemakaian lengkap untuk satu item setting.
 * Dipanggil panel "Pemetaan Pemakaian" saat dibuka oleh SuperAdmin.
 *
 * @param sourceTable - Nama tabel yang menyimpan item
 * @param sourceId    - UUID item spesifik (opsional)
 */
export async function UsageTrackingService_checkUsage(
  sourceTable: string,
  sourceId?: string
): Promise<CheckUsageResult> {
  if (!sourceTable || sourceTable.trim() === '') {
    throw new Error('source_table wajib diisi')
  }
  return usageRepo_checkUsage(sourceTable, sourceId)
}

// ─── Register Dependency ──────────────────────────────────────────────────────

/**
 * Daftarkan dependency baru ke registry.
 * Guard duplikat sudah ada di SP — aman dipanggil berulang.
 *
 * @param payload   - Data dependency yang akan didaftarkan
 * @param createdBy - UUID user yang mendaftarkan (dari JWT)
 */
export async function UsageTrackingService_registerDependency(
  payload: RegisterDependencyPayload,
  createdBy?: string
): Promise<RegisterDependencyResult> {
  // Validasi field wajib
  if (!payload.source_table)       throw new Error('source_table wajib diisi')
  if (!payload.consumer_module_id) throw new Error('consumer_module_id wajib diisi')
  if (!payload.consumer_table)     throw new Error('consumer_table wajib diisi')
  if (!payload.consumer_column)    throw new Error('consumer_column wajib diisi')
  if (!payload.reference_type)     throw new Error('reference_type wajib diisi')

  return usageRepo_registerDependency(payload, createdBy)
}

// ─── Update Status ────────────────────────────────────────────────────────────

/**
 * Ubah lifecycle_status dependency di registry.
 * Aksi yang tersedia per status — lihat USAGE_TRACKING_SPEC Section 3.3.
 *
 * @param dependencyId - UUID row di registry_dependencies
 * @param newStatus    - Status lifecycle baru
 * @param changedBy    - UUID user yang melakukan perubahan (dari JWT)
 */
export async function UsageTrackingService_updateStatus(
  dependencyId: string,
  newStatus: LifecycleStatus,
  changedBy?: string
): Promise<UpdateDependencyStatusResult> {
  if (!dependencyId) throw new Error('dependency_id wajib diisi')
  if (!newStatus)    throw new Error('new_status wajib diisi')

  return usageRepo_updateStatus(dependencyId, newStatus, changedBy)
}

// ─── Get Safety Status Bulk (S#124) ────────────────────────────────────────────

/**
 * Ambil verdict semua item dari tabel cache `registry_safety_status` untuk satu source_table.
 * Dipakai DropdownGroupsClient untuk bulk load saat halaman terbuka — 2 call total,
 * menggantikan 50+ per-item sp_check_usage call sebelumnya.
 *
 * Item yang tidak ada di hasil = 0 dep = AMAN secara implisit.
 *
 * @param sourceTable - Nama tabel sumber (cth: master_dropdown_options)
 */
export async function UsageTrackingService_getSafetyStatusBulk(
  sourceTable: string
): Promise<SafetyStatusResult[]> {
  if (!sourceTable || sourceTable.trim() === '') {
    throw new Error('source_table wajib diisi')
  }
  return usageRepo_getSafetyStatusBulk(sourceTable)
}

// ─── Get Safety Status Single (S#124) ────────────────────────────────────────────

/**
 * Ambil verdict satu item dari tabel cache.
 * Dipakai server-side DELETE guard — lebih cepat dari sp_check_usage (1 query SELECT).
 *
 * @param sourceTable - Nama tabel sumber
 * @param sourceId    - UUID item spesifik, atau null untuk table-level
 */
export async function UsageTrackingService_getSafetyStatusSingle(
  sourceTable: string,
  sourceId: string | null
): Promise<SafetyVerdict> {
  if (!sourceTable) throw new Error('source_table wajib diisi')
  return usageRepo_getSafetyStatusSingle(sourceTable, sourceId)
}
