// lib/repositories/alert-log.repository.ts
// Repository untuk tabel alert_log
// Dipakai oleh: alert.service.ts, alert-queue.service.ts, MonitoringClient.tsx (via API)
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// Refactor S#181: SL-D006 — ganti inline new Date(Date.now()-N*ms).toISOString() dengan getPastISOTimestamp()
// PERUBAHAN Sesi #333 — M3 Deduplication:
//   - insertAlertLog() return string (ID baru) — sebelumnya void
//   - tambah incrementAlertOccurrence() — update occurrence_count + last_occurred_at pada dedup
// PERUBAHAN Sesi #334 — M6 Alert Queue:
//   - tambah updateAlertLogNotifResult() — catat error WA/Email ke DLQ setelah drain queue
// PERUBAHAN Sesi #349 — B3 Dampak Bisnis:
//   - tambah findRecentAlertLogsWithImpact() — Opsi B: fungsi baru JOIN ke provider_instances

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPastISOTimestamp } from '@/lib/utils/date.utils'
import type {
  AlertLog,
  AlertLogWithImpact,
  AlertStatus,
  InsertAlertLogPayload,
} from '@/lib/types/monitoring.types'

// ─── findRecent ───────────────────────────────────────────────────────────────

/**
 * Ambil N alert log terbaru untuk Layer 5 dashboard.
 * @param limit Jumlah baris (default 10 untuk tampilan dashboard)
 */
export async function findRecentAlertLogs(limit: number = 10): Promise<AlertLog[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_log')
    .select('*')
    .order('triggered_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`findRecentAlertLogs: ${error.message}`)
  return (data ?? []) as AlertLog[]
}

// ─── findRecentAlertLogsWithImpact (B3 — S#349) ───────────────────────────────────────────

/**
 * Ambil N alert log terbaru dengan JOIN ke provider_instances (business_impact)
 * dan service_providers (nama provider).
 * Opsi B — fungsi baru terpisah, findRecentAlertLogs() tidak diubah.
 * Dipakai oleh: AlertLogTable (L5) untuk tampilkan dampak bisnis.
 *
 * LEFT join ke provider_instances — ambil instance is_default=true.
 * Jika tidak ada instance default, business_impact = null (tidak error).
 *
 * @param limit Jumlah baris (default 10)
 */
export async function findRecentAlertLogsWithImpact(
  limit: number = 10
): Promise<AlertLogWithImpact[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_log')
    .select(`
      *,
      service_providers(
        nama
      ),
      provider_instances(
        business_impact,
        is_default
      )
    `)
    .order('triggered_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`findRecentAlertLogsWithImpact: ${error.message}`)
  if (!data) return []

  return data.map(row => {
    const sp  = row.service_providers as { nama: string } | null
    // Ambil instance is_default=true untuk business_impact
    const pis = row.provider_instances as Array<{ business_impact: string | null; is_default: boolean }> | null
    const defaultInstance = pis?.find(i => i.is_default)
    const impact = defaultInstance?.business_impact ?? null

    // Bersihkan join fields dari hasil
    const { service_providers: _sp, provider_instances: _pi, ...base } = row as Record<string, unknown>
    void _sp; void _pi

    return {
      ...(base as unknown as AlertLog),
      provider_nama:   sp?.nama ?? null,
      business_impact: impact,
    } satisfies AlertLogWithImpact
  })
}

// ─── findLastAlertByRuleAndType ───────────────────────────────────────────────

/**
 * Cek apakah alert untuk rule + tipe ini masih dalam masa cooldown.
 * Dipakai oleh alert.service sebelum kirim notifikasi.
 * @returns Timestamp alert terakhir, atau null jika belum pernah alert
 */
export async function findLastAlertAt(
  ruleId:    string,
  alertType: string
): Promise<string | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_log')
    .select('triggered_at')
    .eq('rule_id', ruleId)
    .eq('alert_type', alertType)
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null  // tidak ada data = belum pernah alert
    throw new Error(`findLastAlertAt: ${error.message}`)
  }
  return data?.triggered_at ?? null
}

// ─── insertAlertLog ───────────────────────────────────────────────────────────

/**
 * Catat alert yang sudah dikirim (atau gagal dikirim) ke log.
 * Dipanggil dari alert.service setelah proses kirim WA + Email selesai.
 * PERUBAHAN S#333 M3: return string (UUID baru) agar caller bisa pakai ID
 * untuk buildIncidentUrl() — menggantikan placeholder void sebelumnya.
 */
export async function insertAlertLog(
  payload: InsertAlertLogPayload
): Promise<string> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_log')
    .insert({
      rule_id:        payload.rule_id,
      provider_id:    payload.provider_id,
      alert_type:     payload.alert_type,
      message:        payload.message,
      notif_channels: payload.notif_channels,
      sent_via_wa:    payload.sent_via_wa,
      sent_via_email: payload.sent_via_email,
      error_wa:       payload.error_wa    ?? null,
      error_email:    payload.error_email ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`insertAlertLog: ${error.message}`)
  return data.id as string
}

// ─── incrementAlertOccurrence (M3 — S#333) ───────────────────────────────────

/**
 * Increment occurrence_count + update last_occurred_at pada alert log yang sudah ada.
 * Dipanggil saat dedup_key match ditemukan (provider masih DOWN/SLOW, alert sudah terbuka).
 * Tidak insert baris baru — hanya update baris existing untuk hindari spam log.
 *
 * Menggunakan RPC fn_increment_alert_occurrence (atomic di level DB).
 * Alasan: Supabase JS tidak support `kolom = kolom + 1` secara langsung.
 * RPC menjamin atomic — tidak ada race condition meski cron jalan paralel.
 * Pattern sama dengan sp_increment_lock_count di account-lock.repository.
 *
 * @param alertLogId  UUID alert_log yang akan di-increment
 */
export async function incrementAlertOccurrence(alertLogId: string): Promise<void> {
  const supabase = createServerSupabaseClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .rpc('fn_increment_alert_occurrence', {
      p_alert_log_id:    alertLogId,
      p_last_occurred_at: now,
    })

  if (error) throw new Error(`incrementAlertOccurrence: ${error.message}`)
}

// ─── updateAlertLogNotifResult (M6 — S#334) ──────────────────────────────────

/**
 * Update kolom error_wa dan/atau error_email pada alert_log.
 * Dipanggil dari alert-queue.service saat item gagal dikirim setelah drain queue (DLQ pattern).
 * Tidak overwrite data lain — hanya update field notifikasi yang diberikan.
 *
 * @param alertLogId  UUID alert_log target
 * @param payload     Object berisi error_wa dan/atau error_email yang akan diupdate
 */
export async function updateAlertLogNotifResult(
  alertLogId: string,
  payload: Partial<{ error_wa: string; error_email: string }>
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('alert_log')
    .update(payload)
    .eq('id', alertLogId)

  if (error) throw new Error(`updateAlertLogNotifResult: ${error.message}`)
}

// ─── countActiveAlerts ────────────────────────────────────────────────────────

/**
 * Hitung jumlah provider yang sedang punya alert aktif (untuk summary L4).
 * Definisi "aktif": ada alert dalam 24 jam terakhir.
 */
export async function countActiveAlertProviders(): Promise<number> {
  const supabase = createServerSupabaseClient()
  const since24h = getPastISOTimestamp(24, 'hours')

  const { data, error } = await supabase
    .from('alert_log')
    .select('provider_id')
    .gte('triggered_at', since24h)

  if (error) throw new Error(`countActiveAlertProviders: ${error.message}`)

  // distinct provider_id count
  const unique = new Set((data ?? []).map(r => r.provider_id))
  return unique.size
}

// ─── findAlertLogById (M1 — S#331) ───────────────────────────────────────────

/**
 * Ambil satu alert log by ID — dipakai oleh lifecycle service untuk validasi state.
 */
export async function findAlertLogById(id: string): Promise<AlertLog | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('alert_log')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`findAlertLogById: ${error.message}`)
  }
  return data as AlertLog
}

// ─── updateAlertLogStatus (M1 — S#331) ───────────────────────────────────────

/**
 * Update kolom status + kolom lifecycle terkait.
 * Dipanggil dari alert-lifecycle.service.
 */
export async function updateAlertLogStatus(
  id:      string,
  payload: Partial<{
    status:                    AlertStatus
    acknowledged_at:           string
    acknowledged_by:           string
    resolved_at:               string
    resolved_by:               string
    resolution_note:           string
    auto_resolved_at:          string
    downtime_duration_seconds: number
    updated_at:                string
  }>
): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('alert_log')
    .update(payload)
    .eq('id', id)
  if (error) throw new Error(`updateAlertLogStatus: ${error.message}`)
}

// ─── findOpenAlertByDedupKey (A2 — S#331) ────────────────────────────────────

/**
 * Cari insiden terbuka (TRIGGERED atau ACKNOWLEDGED) dengan dedup_key tertentu.
 * Dipakai oleh autoResolveAlert saat provider kembali UP.
 */
export async function findOpenAlertByDedupKey(dedupKey: string): Promise<AlertLog | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('alert_log')
    .select('*')
    .eq('dedup_key', dedupKey)
    .in('status', ['TRIGGERED', 'ACKNOWLEDGED'])
    .order('triggered_at', { ascending: false })
    .limit(1)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`findOpenAlertByDedupKey: ${error.message}`)
  }
  return data as AlertLog
}
