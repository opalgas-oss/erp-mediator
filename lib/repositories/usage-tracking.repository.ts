// lib/repositories/usage-tracking.repository.ts
// Repository untuk USAGE_TRACKING — memanggil 4 stored procedures via Supabase RPC.
// TIDAK ada direct query ke tabel. Semua operasi melalui SP yang sudah ada di DB (S#119–S#120).
//
// 4 fungsi:
//   - usageRepo_checkUsage          : panggil sp_check_usage
//   - usageRepo_registerDependency  : panggil sp_register_dependency
//   - usageRepo_updateStatus        : panggil sp_update_dependency_status
//   - usageRepo_countActualUsage    : panggil sp_count_actual_usage
//
// Dibuat: Sesi #121 — PL-S12 Shared UI + API Routes USAGE_TRACKING

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  CheckUsageResult,
  RegisterDependencyPayload,
  RegisterDependencyResult,
  UpdateDependencyStatusResult,
  LifecycleStatus,
  SafetyStatusResult,
  SafetyVerdict,
} from '@/lib/types/usage-tracking.types'

// ─── sp_check_usage ───────────────────────────────────────────────────────────

/**
 * Ambil info pemakaian lengkap untuk satu item setting.
 * Hasil berisi safety_verdict, breakdown per status, dan daftar dependency.
 *
 * @param sourceTable - Nama tabel yang menyimpan item (cth: master_dropdown_options)
 * @param sourceId    - UUID item spesifik. Jika undefined, cek dependency table-level saja.
 */
export async function usageRepo_checkUsage(
  sourceTable: string,
  sourceId?: string
): Promise<CheckUsageResult> {
  const db = createServerSupabaseClient()

  const { data, error } = await db.rpc('sp_check_usage', {
    p_source_table: sourceTable,
    p_source_id:    sourceId ?? null,
  })

  if (error) {
    console.error('[usageRepo_checkUsage] RPC error:', error)
    throw new Error(`sp_check_usage gagal: ${error.message}`)
  }

  return data as CheckUsageResult
}

// ─── sp_register_dependency ───────────────────────────────────────────────────

/**
 * Daftarkan dependency baru ke registry_dependencies.
 * SP sudah punya guard duplikat — tidak akan double INSERT.
 *
 * @param payload - Data dependency yang akan didaftarkan
 * @param createdBy - UUID user yang mendaftarkan (opsional)
 */
export async function usageRepo_registerDependency(
  payload: RegisterDependencyPayload,
  createdBy?: string
): Promise<RegisterDependencyResult> {
  const db = createServerSupabaseClient()

  const { data, error } = await db.rpc('sp_register_dependency', {
    p_source_table:        payload.source_table,
    p_source_id:           payload.source_id ?? null,
    p_consumer_module_id:  payload.consumer_module_id,
    p_consumer_table:      payload.consumer_table,
    p_consumer_column:     payload.consumer_column,
    p_reference_type:      payload.reference_type,
    p_lifecycle_status:    payload.lifecycle_status ?? 'RENCANA',
    p_description:         payload.description ?? null,
    p_created_by:          createdBy ?? null,
  })

  if (error) {
    console.error('[usageRepo_registerDependency] RPC error:', error)
    throw new Error(`sp_register_dependency gagal: ${error.message}`)
  }

  return data as RegisterDependencyResult
}

// ─── sp_update_dependency_status ─────────────────────────────────────────────

/**
 * Ubah lifecycle_status di registry_dependencies.
 * SP sudah catat audit trail (status_changed_at, status_changed_by).
 *
 * @param dependencyId - UUID row di registry_dependencies
 * @param newStatus    - Status lifecycle baru yang diinginkan
 * @param changedBy    - UUID user yang melakukan perubahan (opsional)
 */
export async function usageRepo_updateStatus(
  dependencyId: string,
  newStatus: LifecycleStatus,
  changedBy?: string
): Promise<UpdateDependencyStatusResult> {
  const db = createServerSupabaseClient()

  const { data, error } = await db.rpc('sp_update_dependency_status', {
    p_dependency_id: dependencyId,
    p_new_status:    newStatus,
    p_changed_by:    changedBy ?? null,
  })

  if (error) {
    console.error('[usageRepo_updateStatus] RPC error:', error)
    throw new Error(`sp_update_dependency_status gagal: ${error.message}`)
  }

  return data as UpdateDependencyStatusResult
}

// ─── sp_count_actual_usage ────────────────────────────────────────────────────

/**
 * Hitung jumlah baris aktual di DB yang menggunakan nilai tertentu.
 * Dipakai untuk validasi apakah dependency benar-benar aktif dipakai data nyata.
 * SP menangani error (tabel tidak ada, kolom tidak ada) → return 0.
 *
 * @param consumerTable  - Nama tabel yang menggunakan nilai
 * @param consumerColumn - Nama kolom yang menyimpan referensi
 * @param value          - Nilai yang dicari (di-cast ke TEXT di SP)
 */
export async function usageRepo_countActualUsage(
  consumerTable: string,
  consumerColumn: string,
  value: string
): Promise<number> {
  const db = createServerSupabaseClient()

  const { data, error } = await db.rpc('sp_count_actual_usage', {
    p_consumer_table:  consumerTable,
    p_consumer_column: consumerColumn,
    p_value:           value,
  })

  if (error) {
    console.error('[usageRepo_countActualUsage] RPC error:', error)
    return 0 // SP juga return 0 saat error — konsisten
  }

  return (data as number) ?? 0
}

// ─── registry_safety_status bulk fetch (S#124) ─────────────────────────────

/**
 * Ambil semua row dari tabel cache `registry_safety_status` untuk source_table tertentu.
 * Dipakai UI untuk bulk load verdict sekaligus — menggantikan 50+ per-item sp_check_usage call.
 *
 * Items dengan 0 dep TIDAK ada di hasil (mereka tidak punya entry di tabel cache).
 * UI memperlakukan item yang tidak ada sebagai AMAN.
 *
 * @param sourceTable - Nama tabel yang dicari (cth: master_dropdown_options)
 */
export async function usageRepo_getSafetyStatusBulk(
  sourceTable: string
): Promise<SafetyStatusResult[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('registry_safety_status')
    .select('*')
    .eq('source_table', sourceTable)
    .order('source_id', { ascending: true, nullsFirst: true })

  if (error) {
    console.error('[usageRepo_getSafetyStatusBulk] Query error:', error)
    throw new Error(`Gagal ambil safety status untuk ${sourceTable}: ${error.message}`)
  }

  return (data ?? []) as SafetyStatusResult[]
}

// ─── registry_safety_status single lookup (S#124) ─────────────────────────────

/**
 * Ambil verdict satu item dari tabel cache registry_safety_status.
 * Dipakai server-side DELETE guard — 1 query vs sp_check_usage yang lebih berat.
 *
 * @param sourceTable - Nama tabel sumber
 * @param sourceId    - UUID item spesifik. Jika null → cari entry table-level.
 * @returns verdict, atau 'AMAN' jika tidak ada entry (0 dep)
 */
export async function usageRepo_getSafetyStatusSingle(
  sourceTable: string,
  sourceId: string | null
): Promise<SafetyVerdict> {
  const db = createServerSupabaseClient()

  let query = db
    .from('registry_safety_status')
    .select('safety_verdict')
    .eq('source_table', sourceTable)

  if (sourceId === null) {
    query = query.is('source_id', null)
  } else {
    query = query.eq('source_id', sourceId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('[usageRepo_getSafetyStatusSingle] Query error:', error)
    // Jika query gagal → fallback AMAN (server guard masih ada layer lain)
    return 'AMAN'
  }

  return (data?.safety_verdict ?? 'AMAN') as SafetyVerdict
}
