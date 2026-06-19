// lib/services/collectors/vercel.collector.ts
// L3 Deep Metrics — Vercel REST API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
//
// Credential: getCredentialsByProvider('vercel').api_token + project_id + team_id
// Dikonfigurasi SuperAdmin di: Integrasi > API Provider > Vercel API
// Anti-hardcode: semua credential dari M3, tidak ada process.env di file ini.

import 'server-only'

/**
 * Kumpulkan deep metrics Vercel via REST API.
 *
 * Credential yang dibutuhkan (dari M3):
 *   - api_token:  Vercel API token (vercel.com/account/tokens)
 *   - project_id: ID project Vercel (mis. prj_xxxxxxxxxxxx)
 *   - team_id:    Team ID Vercel (mis. team_xxxxxxxxxxxx) — opsional untuk personal account
 *
 * Endpoint target:
 *   GET https://api.vercel.com/v6/deployments?projectId={id}&limit=1
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

  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    }

    // Query deployments terbaru
    const teamParam  = teamId ? `&teamId=${teamId}` : ''
    const deployUrl  = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5${teamParam}`
    const deployRes  = await fetch(deployUrl, { headers })

    if (!deployRes.ok) {
      return {
        _error:        `Vercel API error ${deployRes.status}`,
        _token_source: 'M3 Credential Management (vercel.api_token)',
      }
    }

    const deployData = await deployRes.json()
    const deployments: Array<{
      uid: string
      state: string
      createdAt: number
      buildingAt?: number
      ready?: number
      target?: string
    }> = deployData?.deployments ?? []

    const latest = deployments[0]

    // Hitung durasi build deployment terakhir (ms → detik)
    let lastBuildDurationSec = 0
    if (latest?.createdAt && latest?.ready) {
      lastBuildDurationSec = Math.round((latest.ready - latest.createdAt) / 1000)
    }

    // Hitung success rate dari 5 deployment terakhir
    const successCount = deployments.filter(d =>
      d.state === 'READY' || d.state === 'PROMOTED'
    ).length
    const successRatePct = deployments.length > 0
      ? Math.round((successCount / deployments.length) * 100)
      : 0

    return {
      last_deployment_state:      latest?.state          ?? 'UNKNOWN',
      last_deployment_target:     latest?.target         ?? 'UNKNOWN',
      last_deployment_created_at: latest?.createdAt
        ? new Date(latest.createdAt).toISOString()
        : null,
      last_build_duration_sec:    lastBuildDurationSec,
      recent_deployments_count:   deployments.length,
      recent_success_rate_pct:    successRatePct,
      _token_source:              'M3 Credential Management (vercel.api_token)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (vercel.api_token)',
    }
  }
}
