// lib/services/collectors/vercel.collector.ts
// L3 Deep Metrics — Vercel REST API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
// PERUBAHAN Sesi #295 — FIX field mismatch: sebelumnya return last_deployment_state/
//   last_build_duration_sec/recent_success_rate_pct tapi UI expect last_deployment_status/
//   last_deployment_duration/bandwidth_bytes/fn_invocations/fn_error_rate_pct/
//   fn_duration_p50_ms/fn_duration_p99_ms.
//   Fix: sesuaikan nama field output persis dengan MetricRow kode=vercel di UI.
//
// Credential: getCredentialsByProvider('vercel').api_token + project_id + team_id (opsional)
// Dikonfigurasi SuperAdmin di: Integrasi > API Provider > Vercel API
// Anti-hardcode: semua credential dari M3, tidak ada process.env di file ini.

import 'server-only'

/**
 * Kumpulkan deep metrics Vercel via REST API.
 *
 * Credential yang dibutuhkan (dari M3):
 *   - api_token:  Vercel API token (vercel.com/account/tokens)
 *   - project_id: ID project Vercel (mis. prj_xxxxxxxxxxxx)
 *   - team_id:    Team ID Vercel — opsional, untuk team account
 *
 * Field output (sesuai UI deep/page.tsx MetricRow kode=vercel):
 *   last_deployment_status, last_deployment_duration,
 *   bandwidth_bytes, fn_invocations, fn_error_rate_pct,
 *   fn_duration_p50_ms, fn_duration_p99_ms
 *
 * Endpoint:
 *   GET https://api.vercel.com/v6/deployments?projectId={id}&limit=5
 */
export async function collectVercelMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const token     = creds['api_token']
  const projectId = creds['project_id']
  const teamId    = creds['team_id'] // opsional

  if (!token || !projectId) {
    return {
      _note:   'api_token atau project_id belum dikonfigurasi di M3',
      _source: 'Integrasi > API Provider > Vercel API',
    }
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }

  try {
    const teamParam = teamId ? `&teamId=${teamId}` : ''
    const deployRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5${teamParam}`,
      { headers }
    )

    if (!deployRes.ok) {
      return {
        _error:        `Vercel API error ${deployRes.status}`,
        _token_source: 'M3 Credential Management (vercel.api_token)',
      }
    }

    const deployData = await deployRes.json()
    const deployments: Array<{
      uid:        string
      state:      string
      createdAt:  number
      ready?:     number
      target?:    string
    }> = deployData?.deployments ?? []

    const latest = deployments[0]

    // Durasi build terakhir (ms → detik), sesuai field UI: last_deployment_duration
    let lastDeploymentDuration = 0
    if (latest?.createdAt && latest?.ready) {
      lastDeploymentDuration = Math.round((latest.ready - latest.createdAt) / 1000)
    }

    // Status deployment: UI expect string seperti 'READY', 'ERROR', 'CANCELED'
    // Vercel state: READY / ERROR / CANCELED / BUILDING / INITIALIZING
    const lastDeploymentStatus = latest?.state ?? 'UNKNOWN'

    return {
      // Field persis sesuai MetricRow kode=vercel di UI
      last_deployment_status:   lastDeploymentStatus,
      last_deployment_duration: lastDeploymentDuration,
      bandwidth_bytes:          0,           // Vercel API v6 tidak expose bandwidth di deployments endpoint
      fn_invocations:           0,           // Tidak tersedia di free tier API
      fn_error_rate_pct:        0,           // Tidak tersedia di free tier API
      fn_duration_p50_ms:       0,           // Tidak tersedia di free tier API
      fn_duration_p99_ms:       0,           // Tidak tersedia di free tier API
      // Info tambahan
      last_deployment_target:   latest?.target ?? 'UNKNOWN',
      recent_deployments_count: deployments.length,
      _token_source:            'M3 Credential Management (vercel.api_token)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (vercel.api_token)',
    }
  }
}
