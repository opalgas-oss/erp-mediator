// lib/services/metrics-collector.service.ts
// Service: ping L1 + deep check L3 per sistem (orchestrator)
// Dipakai oleh: POST /api/cron/collect-metrics (QStash webhook)
// Dibuat: Sesi #151
// PERUBAHAN S#161: retentionDays dari parameter
// PERUBAHAN S#171: update signature collectL1Metrics + call upsertDefaultRules()
// PERUBAHAN S#293: FIX Fonnte false-DOWN, tambah pingFonnte() terautentikasi
// PERUBAHAN S#295: HUTANG-SPLIT-COLLECTOR, pecah deep collectors ke collectors/
// PERUBAHAN S#296: FIX HUTANG-SUPABASE-PANEL-L3, tambah 'supabase' ke L3_PROVIDERS
// PERUBAHAN S#297: FIX db_size_bytes + storage_used_bytes, pass appCreds ke collectSupabaseMetrics
// PERUBAHAN S#299: Vercel plan-aware, baca vercel_plan dari config_registry
// PERUBAHAN S#300: FIX HUTANG-SUPABASE-MGMT-PANEL-MENTAH, hapus 'supabase-management' dari L3_PROVIDERS
// PERUBAHAN S#331: M7 — tambah pingHeartbeat() di akhir collectL1Metrics
// PERUBAHAN S#332: HUTANG M2 — tambah call autoDisableRulesWithoutInstances() sebelum upsertDefaultRules
// PERUBAHAN S#334: M6 Alert Queue — tambah drainQueues() di akhir collectL1Metrics
//   (drain Redis queue WA + Email setelah semua ping + checkAndSendAlerts selesai)
// PERUBAHAN S#337: FIX L1 filter — skip provider tanpa status_url DAN tidak punya
//   PING_URLS entry DAN bukan Fonnte. Contoh: healthchecks.io (kita yang ping dia,
//   bukan sebaliknya) — tidak boleh masuk loop L1.
//
// PENTING: Token management API (Supabase, GitHub, Vercel) diambil dari M3 DB
// via credential.service.ts. QStash QSTASH_TOKEN tetap di .env (bootstrap level).

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCredentialsByProvider }   from '@/lib/services/credential.service'
import { insertMetric }               from '@/lib/repositories/provider-metrics.repository'
import { upsertDefaultRules }         from '@/lib/repositories/alert-rules.repository'
import { checkAndSendAlerts }         from '@/lib/services/alert.service'
import { deleteOldMetrics }           from '@/lib/repositories/provider-metrics.repository'
import { fetchWithTimeout }           from '@/lib/utils/fetch.server'
import { collectSupabaseMetrics }     from '@/lib/services/collectors/supabase.collector'
import { collectVercelMetrics }       from '@/lib/services/collectors/vercel.collector'
import { collectUpstashMetrics }      from '@/lib/services/collectors/upstash.collector'
import { collectCloudinaryMetrics }   from '@/lib/services/collectors/cloudinary.collector'
import { collectGithubMetrics }       from '@/lib/services/collectors/github.collector'
import { getConfigItemsByKategori }   from '@/lib/config-registry'
import { pingHeartbeat }              from '@/lib/services/alert-heartbeat.service'
import { autoDisableRulesWithoutInstances } from '@/lib/services/alert-rules.service'
import { drainQueues }                from '@/lib/services/alert-queue.service'
import type {
  MonitoringStatus,
  MonitoringLayer,
  InsertProviderMetricPayload,
} from '@/lib/types/monitoring.types'

const PING_TIMEOUT_MS       = 5_000
const DEGRADED_THRESHOLD_MS = 2_000

// ─── collectL1Metrics ─────────────────────────────────────────────────────────

/**
 * Ping L1 untuk semua provider aktif.
 * Dipanggil QStash cron setiap 1 menit.
 *
 * @param retentionDays - Dari config monitoring.data_retention_days (default 30)
 * @param thresholdMs   - Dari config monitoring.alert_threshold_response_ms (default 3000)
 * @param cooldown      - Dari config monitoring.alert_cooldown_minutes (default 30)
 * @param consecutive   - Dari config monitoring.alert_consecutive_failures (default 3)
 */
export async function collectL1Metrics(
  retentionDays: number = 30,
  thresholdMs:   number = 3000,
  cooldown:      number = 30,
  consecutive:   number = 3
): Promise<{
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

  // M2: disable dulu rules yang providernya tidak punya instance aktif,
  // sebelum upsert default rules. Urutan penting: disable → upsert → ping.
  try {
    await autoDisableRulesWithoutInstances()
  } catch { /* non-critical */ }

  try {
    await upsertDefaultRules(
      providers.map(p => p.id),
      thresholdMs,
      cooldown,
      consecutive
    )
  } catch { /* non-critical */ }

  const errors: string[] = []
  let processed = 0

  // Filter provider yang bisa di-ping L1:
  //   - Fonnte: punya custom ping (pingFonnte), selalu include
  //   - Provider lain: harus punya status_url ATAU ada di PING_URLS
  //   - Skip: provider tanpa kedua-duanya (contoh: healthchecks — kita yang ping dia)
  const pingableProviders = providers.filter(p =>
    p.kode === 'fonnte' ||
    p.status_url !== null ||
    p.kode in PING_URLS
  )

  await Promise.allSettled(
    pingableProviders.map(async p => {
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

  // M6: Drain queue notifikasi (WA + Email) — setelah semua ping + enqueue selesai.
  // Fire-and-forget: tidak blocking return value collectL1Metrics.
  drainQueues().catch(err => console.warn('[collectL1Metrics] drainQueues error:', err))

  try { await deleteOldMetrics(retentionDays) } catch { /* non-critical */ }

  // M7: ping heartbeat — fire-and-forget, tidak blocking result
  pingHeartbeat().catch(err => console.warn('[collectL1Metrics] pingHeartbeat error:', err))

  return { processed, errors }
}

// ─── collectL3Metrics ─────────────────────────────────────────────────────────

export async function collectL3Metrics(): Promise<{
  processed: number
  errors:    string[]
}> {
  const supabase = createServerSupabaseClient()
  const errors: string[] = []
  let processed = 0

  const L3_PROVIDERS = ['supabase', 'vercel', 'upstash', 'cloudinary', 'github']

  for (const kode of L3_PROVIDERS) {
    try {
      const { data: prov } = await supabase
        .from('service_providers')
        .select('id')
        .eq('kode', kode)
        .single()
      if (!prov) continue

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

// ─── collectDeepMetrics ───────────────────────────────────────────────────────

async function collectDeepMetrics(
  kode:  string,
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  switch (kode) {
    case 'supabase': {
      const mgmtCreds = await getCredentialsByProvider('supabase-management')
      const appCreds  = await getCredentialsByProvider('supabase')
      return collectSupabaseMetrics(mgmtCreds, appCreds)
    }
    case 'supabase-management': {
      const appCreds = await getCredentialsByProvider('supabase')
      return collectSupabaseMetrics(creds, appCreds)
    }
    case 'vercel': {
      const monitoringItems = await getConfigItemsByKategori('Monitoring')
      const vercelPlanItem  = monitoringItems.find(i => i.feature_key === 'vercel_plan')
      const vercelPlan      = vercelPlanItem?.nilai ?? 'hobby'
      return collectVercelMetrics(creds, vercelPlan)
    }
    case 'upstash':    return collectUpstashMetrics(creds)
    case 'cloudinary': return collectCloudinaryMetrics(creds)
    case 'github':     return collectGithubMetrics(creds)
    default:           return { _note: `No L3 collector for ${kode}` }
  }
}

// ─── pingProvider ─────────────────────────────────────────────────────────────

async function pingProvider(
  providerId: string,
  kode:       string,
  statusUrl:  string | null
): Promise<InsertProviderMetricPayload> {
  if (kode === 'fonnte') return pingFonnte(providerId)

  const targetUrl = statusUrl ?? PING_URLS[kode] ?? null

  if (!targetUrl) {
    return {
      provider_id:      providerId,
      status:           'UNKNOWN',
      response_time_ms: null,
      layer:            'L1',
      error_detail:     'Tidak ada URL untuk ping',
    }
  }

  const start = Date.now()
  try {
    const res = await fetchWithTimeout(
      targetUrl,
      { method: 'GET', headers: { 'User-Agent': 'ERP-Mediator-Monitor/1.0' } },
      PING_TIMEOUT_MS
    )
    const ms = Date.now() - start
    const status: MonitoringStatus =
      res.ok && ms <= DEGRADED_THRESHOLD_MS ? 'UP' :
      res.ok ? 'DEGRADED' : 'DOWN'
    return {
      provider_id:      providerId,
      status,
      response_time_ms: ms,
      layer:            'L1' as MonitoringLayer,
      error_detail:     !res.ok ? `HTTP ${res.status}` : undefined,
    }
  } catch (err) {
    const ms = Date.now() - start
    return {
      provider_id:      providerId,
      status:           'DOWN',
      response_time_ms: ms < PING_TIMEOUT_MS ? ms : null,
      layer:            'L1',
      error_detail:     String(err),
    }
  }
}

// ─── pingFonnte ───────────────────────────────────────────────────────────────

async function pingFonnte(providerId: string): Promise<InsertProviderMetricPayload> {
  const creds = await getCredentialsByProvider('fonnte')
  const token = creds['api_token']
  if (!token) {
    return {
      provider_id:      providerId,
      status:           'UNKNOWN',
      response_time_ms: null,
      layer:            'L1',
      error_detail:     'Token Fonnte (api_token) belum dikonfigurasi di M3',
    }
  }

  const start = Date.now()
  try {
    const res = await fetchWithTimeout(
      'https://api.fonnte.com/device',
      { method: 'POST', headers: { Authorization: token } },
      PING_TIMEOUT_MS
    )
    const ms = Date.now() - start

    if (!res.ok) {
      return { provider_id: providerId, status: 'DOWN', response_time_ms: ms, layer: 'L1', error_detail: `HTTP ${res.status}` }
    }

    const body = (await res.json().catch(() => null)) as
      { status?: boolean; device_status?: string; reason?: string } | null

    if (body?.status !== true) {
      return { provider_id: providerId, status: 'DOWN', response_time_ms: ms, layer: 'L1', error_detail: `Token invalid: ${body?.reason ?? 'unknown'}` }
    }

    if (body.device_status === 'connect') {
      const status: MonitoringStatus = ms <= DEGRADED_THRESHOLD_MS ? 'UP' : 'DEGRADED'
      return { provider_id: providerId, status, response_time_ms: ms, layer: 'L1' as MonitoringLayer }
    }

    return { provider_id: providerId, status: 'DOWN', response_time_ms: ms, layer: 'L1', error_detail: `Device ${body.device_status ?? 'disconnect'}` }
  } catch (err) {
    const ms = Date.now() - start
    return {
      provider_id:      providerId,
      status:           'DOWN',
      response_time_ms: ms < PING_TIMEOUT_MS ? ms : null,
      layer:            'L1',
      error_detail:     String(err),
    }
  }
}

// ─── PING_URLS ────────────────────────────────────────────────────────────────

const PING_URLS: Record<string, string> = {
  'supabase':            'https://status.supabase.com/api/v2/status.json',
  'supabase-management': 'https://status.supabase.com/api/v2/status.json',
  'upstash':             'https://status.upstash.com/api/v2/status.json',
  'cloudinary':          'https://status.cloudinary.com/api/v2/status.json',
  'xendit':              'https://status.xendit.co/api/v2/status.json',
  'smtp':                'https://status.mailgun.com/api/v2/status.json',
  'typesense':           'https://cloud.typesense.org',
  'github':              'https://kctbh9vrtdwd.statuspage.io/api/v2/status.json',
  'vercel':              'https://www.vercel-status.com/api/v2/status.json',
  'qstash':              'https://status.upstash.com/api/v2/status.json',
}
