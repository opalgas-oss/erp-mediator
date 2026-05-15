// lib/services/metrics-collector.service.ts
// Service: ping L1 + deep check L3 per sistem
// Dipakai oleh: POST /api/cron/collect-metrics (QStash webhook)
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
//
// PENTING: Token management API (Supabase, GitHub, Vercel) diambil dari M3 DB
// via credential.service.ts — tidak ada process.env selain QStash (bootstrap level).
// QStash QSTASH_TOKEN tetap di .env karena diperlukan sebelum DB bisa diakses
// (verifikasi webhook signature level infrastruktur — CREDENTIAL_SYSTEM_SPEC BAB 2 Kategori 1).

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

// ─── collectL1Metrics ─────────────────────────────────────────────────────────

/**
 * Ping L1 untuk semua provider aktif.
 * Dipanggil QStash cron setiap 1 menit.
 */
export async function collectL1Metrics(retentionDays: number = 30): Promise<{
  processed: number
  errors:    string[]
}> {
  const supabase = createServerSupabaseClient()
  const { data: providers, error } = await supabase
    .from('service_providers')
    .select('id, kode, nama, status_url')
    .eq('is_aktif', true)

  if (error) throw new Error(`collectL1Metrics: ${error.message}`)
  if (!providers?.length) return { processed: 0, errors: [] }

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

// ─── collectL3Metrics ─────────────────────────────────────────────────────────

/**
 * Deep check L3 untuk sistem yang support.
 * Token diambil dari M3 DB via credential.service (ATURAN 11 — tidak duplikasi .env).
 * Dipanggil QStash cron setiap 15 menit.
 */
export async function collectL3Metrics(): Promise<{
  processed: number
  errors:    string[]
}> {
  const supabase = createServerSupabaseClient()
  const errors: string[] = []
  let processed = 0

  const L3_PROVIDERS = ['supabase-management', 'vercel', 'upstash', 'cloudinary', 'github']

  for (const kode of L3_PROVIDERS) {
    try {
      const { data: prov } = await supabase
        .from('service_providers')
        .select('id')
        .eq('kode', kode)
        .single()
      if (!prov) continue

      // Ambil credential dari M3 DB — bukan process.env
      const creds = await getCredentialsByProvider(kode)
      const metricsData = await collectDeepMetrics(kode, creds)

      await insertMetric({
        provider_id:      prov.id,
        status:           'UP',
        response_time_ms: null,
        layer:            'L3',
        metrics_json:     metricsData,
      })
      processed++
    } catch (err) {
      errors.push(`L3 ${kode}: ${String(err)}`)
    }
  }

  return { processed, errors }
}

// ─── collectDeepMetrics — dispatch ke collector per sistem ────────────────────

async function collectDeepMetrics(
  kode:  string,
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  switch (kode) {
    case 'supabase-management': return collectSupabaseMetrics(creds)
    case 'vercel':              return collectVercelMetrics(creds)
    case 'upstash':             return collectUpstashMetrics(creds)
    case 'cloudinary':          return collectCloudinaryMetrics(creds)
    case 'github':              return collectGithubMetrics(creds)
    default:                    return { _note: `No L3 collector for ${kode}` }
  }
}

// ─── pingProvider ─────────────────────────────────────────────────────────────

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
    clearTimeout(t)

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

// ─── Deep Collectors — token dari M3 via getCredentialsByProvider ──────────

/**
 * Supabase Management API metrics.
 * Token: getCredentialsByProvider('supabase-management').access_token
 * Dikonfigurasi SuperAdmin di Integrasi > API Provider > Supabase Management API.
 */
async function collectSupabaseMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const token = creds['access_token']
  if (!token) return { _note: 'access_token belum dikonfigurasi di M3', _source: 'Integrasi > API Provider > Supabase Management API' }

  // TODO: panggil Supabase Management API dengan token
  // GET https://api.supabase.com/v1/projects/{ref}/health
  // Saat ini return placeholder — diisi setelah endpoint Management API dikonfirmasi
  return {
    db_active_connections:   0,
    db_max_connections:      60,
    db_size_bytes:           0,
    auth_requests_per_min:   0,
    active_sessions:         0,
    edge_fn_invocations:     0,
    edge_fn_error_rate_pct:  0,
    storage_used_bytes:      0,
    _note:                   'Token dikonfigurasi — implementasi API call pending',
    _token_source:           'M3 Credential Management (supabase-management.access_token)',
  }
}

/**
 * Vercel REST API metrics.
 * Token: getCredentialsByProvider('vercel').api_token + project_id
 * Dikonfigurasi SuperAdmin di Integrasi > API Provider > Vercel API.
 */
async function collectVercelMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const token     = creds['api_token']
  const projectId = creds['project_id']
  if (!token || !projectId) return { _note: 'api_token atau project_id belum dikonfigurasi di M3', _source: 'Integrasi > API Provider > Vercel API' }

  // TODO: panggil Vercel REST API
  // GET https://api.vercel.com/v6/deployments?projectId={projectId}
  return {
    last_deployment_status:   'UNKNOWN',
    last_deployment_duration: 0,
    fn_invocations:           0,
    fn_error_rate_pct:        0,
    fn_duration_p50_ms:       0,
    fn_duration_p99_ms:       0,
    bandwidth_bytes:          0,
    _note:                    'Token dikonfigurasi — implementasi API call pending',
    _token_source:            'M3 Credential Management (vercel.api_token)',
  }
}

/**
 * Upstash Redis metrics via REST API.
 * Token: getCredentialsByProvider('upstash').rest_url + rest_token
 * Dikonfigurasi SuperAdmin di Integrasi > API Provider > Upstash Redis (existing).
 */
async function collectUpstashMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const restUrl   = creds['rest_url']
  const restToken = creds['rest_token']
  if (!restUrl || !restToken) return { _note: 'rest_url atau rest_token belum dikonfigurasi di M3', _source: 'Integrasi > API Provider > Upstash Redis' }

  try {
    const res = await fetch(`${restUrl}/info`, {
      headers: { 'Authorization': `Bearer ${restToken}` },
    })
    if (!res.ok) throw new Error(`Upstash INFO error ${res.status}`)
    const data = await res.json()
    return { _raw: data, _token_source: 'M3 Credential Management (upstash.rest_token)' }
  } catch (err) {
    return { _error: String(err), _token_source: 'M3 Credential Management (upstash.rest_token)' }
  }
}

/**
 * Cloudinary Admin API metrics.
 * Token: getCredentialsByProvider('cloudinary').cloud_name + api_key + api_secret
 * Dikonfigurasi SuperAdmin di Integrasi > API Provider > Cloudinary (existing).
 */
async function collectCloudinaryMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const cloudName = creds['cloud_name']
  const apiKey    = creds['api_key']
  const apiSecret = creds['api_secret']
  if (!cloudName || !apiKey || !apiSecret) return { _note: 'Credential Cloudinary belum dikonfigurasi di M3', _source: 'Integrasi > API Provider > Cloudinary' }

  // TODO: panggil Cloudinary Admin API
  // GET https://api.cloudinary.com/v1_1/{cloudName}/usage
  return {
    storage_used_bytes:  0,
    storage_max_bytes:   0,
    bandwidth_bytes:     0,
    bandwidth_max_bytes: 0,
    api_calls:           0,
    api_calls_max:       0,
    _note:               'Token dikonfigurasi — implementasi API call pending',
    _token_source:       'M3 Credential Management (cloudinary)',
  }
}

/**
 * GitHub REST API metrics.
 * Token: getCredentialsByProvider('github').personal_access_token + repository_owner + repository_name
 * Dikonfigurasi SuperAdmin di Integrasi > API Provider > GitHub.
 */
async function collectGithubMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const token   = creds['personal_access_token']
  const owner   = creds['repository_owner']
  const repo    = creds['repository_name']
  if (!token || !owner || !repo) return { _note: 'Credential GitHub belum dikonfigurasi di M3', _source: 'Integrasi > API Provider > GitHub' }

  try {
    const [workflowRes, prsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
      }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' },
      }),
    ])

    const [workflowData, prsData] = await Promise.all([
      workflowRes.ok ? workflowRes.json() : null,
      prsRes.ok     ? prsRes.json()       : null,
    ])

    const lastRun = workflowData?.workflow_runs?.[0]
    return {
      last_workflow_status:    lastRun?.conclusion  ?? 'UNKNOWN',
      last_workflow_duration:  lastRun
        ? Math.round((new Date(lastRun.updated_at).getTime() - new Date(lastRun.created_at).getTime()) / 1000)
        : 0,
      open_pull_requests:      Array.isArray(prsData) ? prsData.length : 0,
      last_commit_at:          lastRun?.created_at  ?? null,
      _token_source:           'M3 Credential Management (github.personal_access_token)',
    }
  } catch (err) {
    return { _error: String(err), _token_source: 'M3 Credential Management (github.personal_access_token)' }
  }
}
