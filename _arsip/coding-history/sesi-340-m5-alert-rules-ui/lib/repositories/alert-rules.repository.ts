// lib/repositories/alert-rules.repository.ts
// Repository untuk tabel alert_rules
// Dipakai oleh: alert.service.ts, monitoring.service.ts
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  AlertRule,
  UpdateAlertRulePayload,
} from '@/lib/types/monitoring.types'

// ─── findAll ──────────────────────────────────────────────────────────────────

/**
 * Ambil semua alert rules yang aktif, join nama provider.
 */
export async function findAllAlertRules(): Promise<AlertRule[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .order('provider_id')
    .order('alert_type')

  if (error) throw new Error(`findAllAlertRules: ${error.message}`)
  return (data ?? []) as AlertRule[]
}

// ─── findByProvider ───────────────────────────────────────────────────────────

/**
 * Ambil semua rules untuk satu provider tertentu.
 * Dipakai oleh alert.service saat threshold check.
 */
export async function findRulesByProvider(providerId: string): Promise<AlertRule[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true)

  if (error) throw new Error(`findRulesByProvider: ${error.message}`)
  return (data ?? []) as AlertRule[]
}

// ─── findById ─────────────────────────────────────────────────────────────────

export async function findAlertRuleById(id: string): Promise<AlertRule | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`findAlertRuleById: ${error.message}`)
  }
  return data as AlertRule
}

// ─── updateRule ───────────────────────────────────────────────────────────────

/**
 * Update threshold/cooldown/channel/status satu alert rule.
 * Hanya SuperAdmin yang boleh — RLS sudah guard di DB level.
 */
export async function updateAlertRule(
  id:        string,
  payload:   UpdateAlertRulePayload,
  updatedBy: string
): Promise<AlertRule> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`updateAlertRule: ${error.message}`)
  return data as AlertRule
}

// ─── upsertDefaultRules ───────────────────────────────────────────────────────

/**
 * Buat default alert rules untuk semua provider jika belum ada.
 * Dipanggil dari collect-metrics cron saat pertama kali jalan.
 * Nilai threshold dari config_registry monitoring.* keys.
 *
 * @param providerIds Daftar UUID semua provider aktif
 * @param thresholdMs Dari config monitoring.alert_threshold_response_ms
 * @param cooldown    Dari config monitoring.alert_cooldown_minutes
 * @param consecutive Dari config monitoring.alert_consecutive_failures
 */
export async function upsertDefaultRules(
  providerIds: string[],
  thresholdMs: number,
  cooldown:    number,
  consecutive: number
): Promise<void> {
  const supabase = createServerSupabaseClient()

  const rows = providerIds.flatMap(pid => [
    {
      provider_id:          pid,
      alert_type:           'DOWN' as const,
      threshold_value:      1,
      consecutive_failures: consecutive,
      cooldown_minutes:     cooldown,
      notif_channels:       ['WA', 'EMAIL'],
      is_active:            true,
    },
    {
      provider_id:          pid,
      alert_type:           'SLOW' as const,
      threshold_value:      thresholdMs,
      consecutive_failures: consecutive,
      cooldown_minutes:     cooldown,
      notif_channels:       ['WA', 'EMAIL'],
      is_active:            true,
    },
  ])

  const { error } = await supabase
    .from('alert_rules')
    .upsert(rows, {
      onConflict:        'provider_id,alert_type',
      ignoreDuplicates:  true,  // tidak overwrite yang sudah diubah manual SuperAdmin
    })

  if (error) throw new Error(`upsertDefaultRules: ${error.message}`)
}
