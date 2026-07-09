// ARSIP — Sesi #333 — Sebelum M3 Deduplication
// File asli: lib/repositories/alert-log.repository.ts
// Repository untuk tabel alert_log
// Dipakai oleh: alert.service.ts, MonitoringClient.tsx (via API)
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// Refactor S#181: SL-D006 — ganti inline new Date(Date.now()-N*ms).toISOString() dengan getPastISOTimestamp()

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPastISOTimestamp } from '@/lib/utils/date.utils'
import type {
  AlertLog,
  AlertStatus,
  InsertAlertLogPayload,
} from '@/lib/types/monitoring.types'

// ─── findRecent ───────────────────────────────────────────────────────────────

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

export async function findLastAlertAt(ruleId: string, alertType: string): Promise<string | null> {
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
    if (error.code === 'PGRST116') return null
    throw new Error(`findLastAlertAt: ${error.message}`)
  }
  return data?.triggered_at ?? null
}

export async function insertAlertLog(payload: InsertAlertLogPayload): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
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
  if (error) throw new Error(`insertAlertLog: ${error.message}`)
}

export async function countActiveAlertProviders(): Promise<number> {
  const supabase = createServerSupabaseClient()
  const since24h = getPastISOTimestamp(24, 'hours')
  const { data, error } = await supabase
    .from('alert_log')
    .select('provider_id')
    .gte('triggered_at', since24h)
  if (error) throw new Error(`countActiveAlertProviders: ${error.message}`)
  const unique = new Set((data ?? []).map(r => r.provider_id))
  return unique.size
}

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

export async function updateAlertLogStatus(
  id: string,
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
