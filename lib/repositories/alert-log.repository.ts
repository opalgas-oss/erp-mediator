// lib/repositories/alert-log.repository.ts
// Repository untuk tabel alert_log
// Dipakai oleh: alert.service.ts, MonitoringClient.tsx (via API)
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  AlertLog,
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
 */
export async function insertAlertLog(
  payload: InsertAlertLogPayload
): Promise<void> {
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

// ─── countActiveAlerts ────────────────────────────────────────────────────────

/**
 * Hitung jumlah provider yang sedang punya alert aktif (untuk summary L4).
 * Definisi "aktif": ada alert dalam 24 jam terakhir.
 */
export async function countActiveAlertProviders(): Promise<number> {
  const supabase = createServerSupabaseClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('alert_log')
    .select('provider_id')
    .gte('triggered_at', since24h)

  if (error) throw new Error(`countActiveAlertProviders: ${error.message}`)

  // distinct provider_id count
  const unique = new Set((data ?? []).map(r => r.provider_id))
  return unique.size
}
