// lib/services/metrics-collector.service.ts — PRE-EDIT ARSIP S#180 SL-D004+K004
// KONDISI PRE-EDIT: pingProvider() punya inline AbortController — belum pakai fetchWithTimeout
// BUG AKTIF: clearTimeout(t) di pingProvider() tidak dieksekusi di catch block → timer leak

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCredentialsByProvider } from '@/lib/services/credential.service'
import { insertMetric }          from '@/lib/repositories/provider-metrics.repository'
import { upsertDefaultRules }    from '@/lib/repositories/alert-rules.repository'
import { checkAndSendAlerts }    from '@/lib/services/alert.service'
import { deleteOldMetrics }      from '@/lib/repositories/provider-metrics.repository'
import type {
  MonitoringStatus,
  MonitoringLayer,
  InsertProviderMetricPayload,
} from '@/lib/types/monitoring.types'

const PING_TIMEOUT_MS  = 5_000
const DEGRADED_THRESHOLD_MS = 2_000

export async function collectL1Metrics(
  retentionDays: number = 30,
  thresholdMs:   number = 3000,
  cooldown:      number = 30,
  consecutive:   number = 3
): Promise<{ processed: number; errors: string[] }> {
  const supabase = createServerSupabaseClient()
  const { data: providers, error } = await supabase
    .from('service_providers')
    .select('id, kode, nama, status_url')
    .eq('is_aktif', true)

  if (error) throw new Error(`collectL1Metrics: ${error.message}`)
  if (!providers?.length) return { processed: 0, errors: [] }

  try {
    await upsertDefaultRules(providers.map(p => p.id), thresholdMs, cooldown, consecutive)
  } catch { /* non-critical */ }

  const errors: string[] = []
  let processed = 0

  await Promise.allSettled(
    providers.map(async p => {
      try {
        const result = await pingProvider(p.id, p.kode, p.status_url)
        await insertMetric(result)
        await checkAndSendAlerts(p.id, result.status, result.response_time_ms)
        processed++
      } catch (err) {
        errors.push(`${p.kode}: ${String(err)}`)
      }
    })
  )

  try { await deleteOldMetrics(retentionDays) } catch { /* non-critical */ }
  return { processed, errors }
}

export async function collectL3Metrics(): Promise<{ processed: number; errors: string[] }> {
  const supabase = createServerSupabaseClient()
  const errors: string[] = []
  let processed = 0
  const L3_PROVIDERS = ['supabase-management', 'vercel', 'upstash', 'cloudinary', 'github']
  for (const kode of L3_PROVIDERS) {
    try {
      const { data: prov } = await supabase.from('service_providers').select('id').eq('kode', kode).single()
      if (!prov) continue
      const creds = await getCredentialsByProvider(kode)
      const metricsData = await collectDeepMetrics(kode, creds)
      await insertMetric({ provider_id: prov.id, status: 'UP', response_time_ms: null, layer: 'L3', metrics_json: metricsData })
      processed++
    } catch (err) {
      errors.push(`L3 ${kode}: ${String(err)}`)
    }
  }
  return { processed, errors }
}

async function collectDeepMetrics(kode: string, creds: Record<string, string>): Promise<Record<string, unknown>> {
  switch (kode) {
    case 'supabase-management': return collectSupabaseMetrics(creds)
    case 'vercel':              return collectVercelMetrics(creds)
    case 'upstash':             return collectUpstashMetrics(creds)
    case 'cloudinary':          return collectCloudinaryMetrics(creds)
    case 'github':              return collectGithubMetrics(creds)
    default:                    return { _note: `No L3 collector for ${kode}` }
  }
}

// BUG: clearTimeout(t) tidak dieksekusi di catch block → timer leak saat network error
async function pingProvider(
  providerId: string,
  kode:       string,
  statusUrl:  string | null
): Promise<InsertProviderMetricPayload> {
  const targetUrl = statusUrl ?? PING_URLS[kode] ?? null
  if (!targetUrl) {
    return { provider_id: providerId, status: 'UNKNOWN', response_time_ms: null, layer: 'L1', error_detail: 'Tidak ada URL untuk ping' }
  }
  const start = Date.now()
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)
    const res = await fetch(targetUrl, { method: 'GET', signal: controller.signal, headers: { 'User-Agent': 'ERP-Mediator-Monitor/1.0' } })
    clearTimeout(t)   // BUG: tidak jalan kalau fetch throw di atas
    const ms = Date.now() - start
    const status: MonitoringStatus = res.ok && ms <= DEGRADED_THRESHOLD_MS ? 'UP' : res.ok ? 'DEGRADED' : 'DOWN'
    return { provider_id: providerId, status, response_time_ms: ms, layer: 'L1' as MonitoringLayer, error_detail: !res.ok ? `HTTP ${res.status}` : undefined }
  } catch (err) {
    const ms = Date.now() - start
    return { provider_id: providerId, status: 'DOWN', response_time_ms: ms < PING_TIMEOUT_MS ? ms : null, layer: 'L1', error_detail: String(err) }
  }
}

const PING_URLS: Record<string, string> = {
  'supabase':            'https://status.supabase.com/api/v2/status.json',
  'supabase-management': 'https://status.supabase.com/api/v2/status.json',
  'upstash':             'https://status.upstash.com/api/v2/status.json',
  'cloudinary':          'https://status.cloudinary.com/api/v2/status.json',
  'xendit':              'https://status.xendit.co/api/v2/status.json',
  'fonnte':              'https://api.fonnte.com',
  'smtp':                'https://status.mailgun.com/api/v2/status.json',
  'typesense':           'https://cloud.typesense.org',
  'github':              'https://kctbh9vrtdwd.statuspage.io/api/v2/status.json',
  'vercel':              'https://www.vercel-status.com/api/v2/status.json',
  'qstash':              'https://status.upstash.com/api/v2/status.json',
}

// [collectSupabaseMetrics, collectVercelMetrics, collectUpstashMetrics,
//  collectCloudinaryMetrics, collectGithubMetrics — tidak berubah, arsip placeholder]
async function collectSupabaseMetrics(creds: Record<string, string>): Promise<Record<string, unknown>> { return { _arsip: true } }
async function collectVercelMetrics(creds: Record<string, string>): Promise<Record<string, unknown>> { return { _arsip: true } }
async function collectUpstashMetrics(creds: Record<string, string>): Promise<Record<string, unknown>> { return { _arsip: true } }
async function collectCloudinaryMetrics(creds: Record<string, string>): Promise<Record<string, unknown>> { return { _arsip: true } }
async function collectGithubMetrics(creds: Record<string, string>): Promise<Record<string, unknown>> { return { _arsip: true } }
