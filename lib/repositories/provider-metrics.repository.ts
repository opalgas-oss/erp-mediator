// lib/repositories/provider-metrics.repository.ts
// Repository untuk tabel provider_metrics
// Dipakai oleh: metrics-collector.service.ts, monitoring.service.ts
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard

import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  ProviderMetric,
  InsertProviderMetricPayload,
  ProviderSnapshot,
} from '@/lib/types/monitoring.types'

export async function findLatestMetricsPerProvider(): Promise<ProviderSnapshot[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.rpc('fn_get_latest_metrics_per_provider')
  if (error) throw new Error(`findLatestMetricsPerProvider: ${error.message}`)
  return (data ?? []) as ProviderSnapshot[]
}

export async function findRecentByProvider(
  providerId: string, limitMinutes: number = 60
): Promise<ProviderMetric[]> {
  const supabase = createServerSupabaseClient()
  const since = new Date(Date.now() - limitMinutes * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('provider_metrics').select('*')
    .eq('provider_id', providerId).eq('layer', 'L1')
    .gte('checked_at', since).order('checked_at', { ascending: true })
  if (error) throw new Error(`findRecentByProvider: ${error.message}`)
  return (data ?? []) as ProviderMetric[]
}

export async function findSinceTimestamp(since: string): Promise<ProviderMetric[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('provider_metrics').select('*')
    .eq('layer', 'L1').gt('checked_at', since)
    .order('checked_at', { ascending: true })
  if (error) throw new Error(`findSinceTimestamp: ${error.message}`)
  return (data ?? []) as ProviderMetric[]
}

export async function insertMetric(payload: InsertProviderMetricPayload): Promise<void> {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('provider_metrics').insert({
    provider_id:      payload.provider_id,
    status:           payload.status,
    response_time_ms: payload.response_time_ms,
    layer:            payload.layer,
    metrics_json:     payload.metrics_json ?? null,
    error_detail:     payload.error_detail ?? null,
  })
  if (error) throw new Error(`insertMetric: ${error.message}`)
}

export async function deleteOldMetrics(retentionDays: number = 30): Promise<number> {
  const supabase = createServerSupabaseClient()
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('provider_metrics').delete({ count: 'exact' }).lt('checked_at', cutoff)
  if (error) throw new Error(`deleteOldMetrics: ${error.message}`)
  return count ?? 0
}

export async function computeUptimePct(
  providerId: string, hours: number
): Promise<number | null> {
  const supabase = createServerSupabaseClient()
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('provider_metrics').select('status')
    .eq('provider_id', providerId).eq('layer', 'L1').gte('checked_at', since)
  if (error) throw new Error(`computeUptimePct: ${error.message}`)
  if (!data || data.length === 0) return null
  const up = data.filter(r => r.status === 'UP').length
  return Math.round((up / data.length) * 1000) / 10
}
