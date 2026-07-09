// lib/repositories/alert-rules.repository.ts
// Repository untuk tabel alert_rules
// Dipakai oleh: alert.service.ts, monitoring.service.ts
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// ============================================================
// ARSIP SESI #342 — sebelum integrasi M8 Audit Trail
// ============================================================

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  AlertRule,
  AlertRuleWithProvider,
  UpdateAlertRulePayload,
} from '@/lib/types/monitoring.types'

export async function findAllAlertRules(): Promise<AlertRuleWithProvider[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*, service_providers(nama, kode, kategori)')
    .order('provider_id')
    .order('alert_type')

  if (error) throw new Error(`findAllAlertRules: ${error.message}`)

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as AlertRule & {
      service_providers: { nama: string; kode: string; kategori: string } | null
    }
    return {
      ...r,
      provider_nama:     r.service_providers?.nama     ?? '',
      provider_kode:     r.service_providers?.kode     ?? '',
      provider_kategori: r.service_providers?.kategori ?? '',
      service_providers: undefined,
    } as AlertRuleWithProvider
  })
}

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
      ignoreDuplicates:  true,
    })

  if (error) throw new Error(`upsertDefaultRules: ${error.message}`)
}
