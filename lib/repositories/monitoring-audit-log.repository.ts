// lib/repositories/monitoring-audit-log.repository.ts
// Repository: tabel monitoring_audit_log — append-only audit trail sistem monitoring (M8)
// Dipakai oleh: alert-lifecycle.service.ts, alert-rules.repository.ts, alert-test/route.ts
// Dibuat: Sesi #342 — M8 Audit Trail
//
// ⚠️  APPEND-ONLY: tidak ada UPDATE/DELETE dari aplikasi terhadap tabel ini.
//     Setiap aksi = baris baru. Ini adalah keputusan arsitektur dari BLUEPRINT_ALERT_MONITORING_v1.md BAB 5.4.
//
// Nilai action yang valid:
//   ACKNOWLEDGE | RESOLVE | REOPEN | AUTO_RESOLVED
//   RULE_DISABLE | RULE_ENABLE | RULE_CREATE | RULE_UPDATE
//   MAINTENANCE_CREATE | MAINTENANCE_END
//   AUTO_DISABLE | TEST_ALERT

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonitoringAuditAction =
  | 'ACKNOWLEDGE'
  | 'RESOLVE'
  | 'REOPEN'
  | 'AUTO_RESOLVED'
  | 'RULE_DISABLE'
  | 'RULE_ENABLE'
  | 'RULE_CREATE'
  | 'RULE_UPDATE'
  | 'MAINTENANCE_CREATE'
  | 'MAINTENANCE_END'
  | 'AUTO_DISABLE'
  | 'TEST_ALERT'

export type MonitoringAuditEntityType =
  | 'alert_log'
  | 'alert_rules'
  | 'maintenance_windows'

export interface WriteMonitoringAuditPayload {
  /** UUID auth.users pelaku. Kosongkan (undefined) jika SYSTEM (cron / auto). */
  actor?:       string
  /** Label teks pelaku: 'SA:nama' atau 'SYSTEM'. Default 'SYSTEM' jika tidak diisi. */
  actor_label?: string
  action:       MonitoringAuditAction
  entity_type:  MonitoringAuditEntityType
  entity_id:    string
  /** Detail tambahan opsional — format JSON bebas per action type. */
  detail_json?: Record<string, unknown>
}

// ─── writeMonitoringAudit ─────────────────────────────────────────────────────

/**
 * Catat satu aksi ke tabel monitoring_audit_log.
 * Append-only — tidak ada update/delete terhadap tabel ini.
 *
 * Fire-and-forget pattern: error di sini TIDAK boleh gagalkan aksi utama.
 * Caller WAJIB wrap dengan try/catch dan handle error sendiri (mis. console.error saja).
 *
 * Contoh pemanggilan:
 *   await writeMonitoringAudit({
 *     actor:       uid,
 *     actor_label: `SA:${nama}`,
 *     action:      'ACKNOWLEDGE',
 *     entity_type: 'alert_log',
 *     entity_id:   alertLogId,
 *     detail_json: { provider_id, alert_type, from_status: 'TRIGGERED' },
 *   })
 */
export async function writeMonitoringAudit(
  payload: WriteMonitoringAuditPayload
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('monitoring_audit_log')
    .insert({
      actor:       payload.actor       ?? null,
      actor_label: payload.actor_label ?? 'SYSTEM',
      action:      payload.action,
      entity_type: payload.entity_type,
      entity_id:   payload.entity_id,
      detail_json: payload.detail_json ?? null,
    })

  if (error) throw new Error(`writeMonitoringAudit: ${error.message}`)
}

// ─── findAuditByEntity ────────────────────────────────────────────────────────

/**
 * Ambil riwayat audit untuk satu entity tertentu (misal: satu alert_log ID).
 * Diurutkan dari terbaru ke terlama.
 * Dipakai oleh: C6 Timeline per Insiden (Fase 2 — belum diimplementasi).
 *
 * @param entity_type  Tabel target: alert_log | alert_rules | maintenance_windows
 * @param entity_id    UUID baris yang dicari riwayatnya
 * @param limit        Maksimal baris yang dikembalikan (default 50)
 */
export async function findAuditByEntity(
  entity_type: MonitoringAuditEntityType,
  entity_id:   string,
  limit:        number = 50
) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('monitoring_audit_log')
    .select('*')
    .eq('entity_type', entity_type)
    .eq('entity_id',   entity_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`findAuditByEntity: ${error.message}`)
  return data ?? []
}
