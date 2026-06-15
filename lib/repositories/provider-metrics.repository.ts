// lib/repositories/provider-metrics.repository.ts
// Repository untuk tabel provider_metrics
// Dipakai oleh: metrics-collector.service.ts, monitoring.service.ts
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// Refactor S#181: SL-D006 — ganti inline new Date(Date.now()-N*ms).toISOString() dengan getPastISOTimestamp()

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPastISOTimestamp } from '@/lib/utils/date.utils'
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
  const since = getPastISOTimestamp(limitMinutes, 'minutes')
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
  const cutoff = getPastISOTimestamp(retentionDays, 'days')
  const { count, error } = await supabase
    .from('provider_metrics').delete({ count: 'exact' }).lt('checked_at', cutoff)
  if (error) throw new Error(`deleteOldMetrics: ${error.message}`)
  return count ?? 0
}

export async function computeUptimePct(
  providerId: string, hours: number
): Promise<number | null> {
  const supabase = createServerSupabaseClient()
  const since = getPastISOTimestamp(hours, 'hours')
  const { data, error } = await supabase
    .from('provider_metrics').select('status')
    .eq('provider_id', providerId).eq('layer', 'L1').gte('checked_at', since)
  if (error) throw new Error(`computeUptimePct: ${error.message}`)
  if (!data || data.length === 0) return null
  const up = data.filter(r => r.status === 'UP').length
  return Math.round((up / data.length) * 1000) / 10
}

// ─── findLatestL3MetricsPerProvider ───────────────────────────────────────────

/**
 * Ambil data L3 (deep metrics) terbaru per provider.
 * Dipakai oleh: monitoring/deep/page.tsx (M02)
 * Return: map provider_id → metrics_json
 *
 * Dibuat: Sesi #283 — M02 Deep Metrics page
 */
export async function findLatestL3MetricsPerProvider(): Promise<
  Record<string, Record<string, unknown>>
> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('provider_metrics')
    .select('provider_id, metrics_json, checked_at')
    .eq('layer', 'L3')
    .order('checked_at', { ascending: false })
  if (error) throw new Error(`findLatestL3MetricsPerProvider: ${error.message}`)

  // Ambil entry terbaru per provider (sudah diorder DESC, pakai first-match)
  const result: Record<string, Record<string, unknown>> = {}
  for (const row of data ?? []) {
    if (!result[row.provider_id] && row.metrics_json) {
      result[row.provider_id] = row.metrics_json as Record<string, unknown>
    }
  }
  return result
}

// ─── findDailyStatusByProvider ────────────────────────────────────────────────

/**
 * Hitung status dominan per hari selama 7 hari terakhir untuk satu provider.
 * Dipakai oleh: monitoring/uptime/page.tsx (M03)
 * Return: array 7 elemen (index 0 = 6 hari lalu, index 6 = hari ini)
 *
 * Dibuat: Sesi #283 — M03 Laporan Uptime page
 */
export async function findDailyStatusByProvider(
  providerId: string
): Promise<Array<'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'>> {
  const supabase = createServerSupabaseClient()
  const result: Array<'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'> = []

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const from = new Date()
    from.setDate(from.getDate() - dayOffset)
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from('provider_metrics')
      .select('status')
      .eq('provider_id', providerId)
      .eq('layer', 'L1')
      .gte('checked_at', from.toISOString())
      .lte('checked_at', to.toISOString())

    if (!data || data.length === 0) { result.push('UNKNOWN'); continue }

    const upCount   = data.filter(r => r.status === 'UP').length
    const downCount = data.filter(r => r.status === 'DOWN').length
    const pct       = upCount / data.length

    if (downCount > 0 && pct < 0.5) result.push('DOWN')
    else if (pct >= 0.995)           result.push('UP')
    else                             result.push('DEGRADED')
  }
  return result
}
