// lib/services/metrics-collector.service.ts
// Service: ping L1 + deep check L3 per sistem (orchestrator)
// Dipakai oleh: POST /api/cron/collect-metrics (QStash webhook)
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// PERUBAHAN Sesi #161 — T-017: retentionDays dari parameter (dibaca config di caller route.ts)
// PERUBAHAN Sesi #171 — T-055: update signature collectL1Metrics tambah thresholdMs+cooldown+consecutive,
//   tambah call upsertDefaultRules() setelah providers diambil — sebelumnya diimport tapi tidak dipanggil.
// PERUBAHAN Sesi #293 — FIX Fonnte false-DOWN: pingProvider() GET generik tidak bisa cek Fonnte
//   (Fonnte tidak punya status-page publik; status_url '/check' → HTTP 404). Tambah pingFonnte()
//   terautentikasi (POST /device + api_token M3, baca device_status) + dispatch kode==='fonnte'.
// PERUBAHAN Sesi #295 — HUTANG-SPLIT-COLLECTOR: pecah deep collectors ke file terpisah di collectors/.
//   File ini sekarang hanya orchestrator (L1 ping + L3 dispatch). Logic collector per-provider
//   dipindah ke lib/services/collectors/{supabase,vercel,upstash,cloudinary,github}.collector.ts.
//   API publik (collectL1Metrics, collectL3Metrics) tidak berubah — caller route.ts tidak perlu diubah.
// PERUBAHAN Sesi #296 — FIX HUTANG-SUPABASE-PANEL-L3: tambah 'supabase' ke L3_PROVIDERS +
//   tambah case 'supabase' di collectDeepMetrics() — credential diambil dari 'supabase-management'
//   (reuse collectSupabaseMetrics). Sebelumnya panel Supabase di Deep Metrics selalu
//   "Data L3 belum tersedia" karena kode='supabase' tidak ada di L3_PROVIDERS.
// PERUBAHAN Sesi #297 — FIX db_size_bytes + storage_used_bytes selalu 0:
//   case 'supabase' di collectDeepMetrics() sekarang pass appCreds (project_url + service_role_key
//   dari provider 'supabase') ke collectSupabaseMetrics() sebagai parameter ke-2.
//   collectSupabaseMetrics() gunakan appCreds untuk RPC monitoring.collect_metrics() yang
//   mengambil pg_database_size() + storage.objects SUM langsung dari DB (lebih akurat + tersedia).
// PERUBAHAN Sesi #299 — Vercel plan-aware: baca vercel_plan dari config_registry,
//   pass ke collectVercelMetrics() agar bandwidth_bytes + fn_invocations return null
//   di plan hobby (bukan 0 yang menyesatkan di UI CapacityRow).
// PERUBAHAN Sesi #300 — FIX HUTANG-SUPABASE-MGMT-PANEL-MENTAH: hapus 'supabase-management'
//   dari L3_PROVIDERS. Panel tampil field mentah/duplikat karena kode tidak dikenal UI
//   (branch generic key-value). Data L3 Supabase sudah lengkap di panel 'supabase'.
//   Alert DOWN+SLOW supabase-management tidak terdampak (L1/L2, bukan L3).
//
// PENTING: Token management API (Supabase, GitHub, Vercel) diambil dari M3 DB
// via credential.service.ts — tidak ada process.env selain QStash (bootstrap level).
// QStash QSTASH_TOKEN tetap di .env karena diperlukan sebelum DB bisa diakses
// (verifikasi webhook signature level infrastruktur — CREDENTIAL_SYSTEM_SPEC BAB 2 Kategori 1).

// PERUBAHAN Sesi #331 — M7: tambah pingHeartbeat() di akhir collectL1Metrics
//   (dead-man's switch: ping Healthchecks.io + simpan last_run_at ke Redis).
// ── ARSIP PRA-S332 (Hutang M2 integrasi cron) ──
// File ini adalah snapshot SEBELUM tambah call autoDisableRulesWithoutInstances()
// di collectL1Metrics. Hutang: fungsi ada di alert-rules.service.ts tapi belum dipanggil.
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
import type {
  MonitoringStatus,
  MonitoringLayer,
  InsertProviderMetricPayload,
} from '@/lib/types/monitoring.types'

const PING_TIMEOUT_MS       = 5_000
const DEGRADED_THRESHOLD_MS = 2_000

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

  pingHeartbeat().catch(err => console.warn('[collectL1Metrics] pingHeartbeat error:', err))

  return { processed, errors }
}

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
