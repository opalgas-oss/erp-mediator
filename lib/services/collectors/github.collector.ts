// lib/services/collectors/github.collector.ts
// L3 Deep Metrics — GitHub REST API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
//
// Credential: getCredentialsByProvider('github').personal_access_token + repository_owner + repository_name
// Dikonfigurasi SuperAdmin di: Integrasi > API Provider > GitHub
// Anti-hardcode: semua credential dari M3, tidak ada process.env di file ini.
// Catatan: fungsi ini sudah ada sejak versi monolith — dipindah ke file terpisah tanpa perubahan logic.

import 'server-only'

/**
 * Kumpulkan deep metrics GitHub via REST API.
 *
 * Credential yang dibutuhkan (dari M3):
 *   - personal_access_token: GitHub PAT (github.com/settings/tokens)
 *   - repository_owner:      Owner/org repo (mis. philips-liemena)
 *   - repository_name:       Nama repo (mis. erp-mediator)
 *
 * Endpoint target:
 *   GET https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page=1
 *   GET https://api.github.com/repos/{owner}/{repo}/pulls?state=open&per_page=100
 */
export async function collectGithubMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const token = creds['personal_access_token']
  const owner = creds['repository_owner']
  const repo  = creds['repository_name']

  if (!token || !owner || !repo) {
    return {
      _note:   'Credential GitHub belum dikonfigurasi di M3',
      _source: 'Integrasi > API Provider > GitHub',
    }
  }

  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept':        'application/vnd.github+json',
    }

    const [workflowRes, prsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`, { headers }),
    ])

    const [workflowData, prsData] = await Promise.all([
      workflowRes.ok ? workflowRes.json() : null,
      prsRes.ok     ? prsRes.json()       : null,
    ])

    const lastRun = workflowData?.workflow_runs?.[0]

    return {
      last_workflow_status:   lastRun?.conclusion ?? 'UNKNOWN',
      last_workflow_duration: lastRun
        ? Math.round(
            (new Date(lastRun.updated_at).getTime() - new Date(lastRun.created_at).getTime()) / 1000
          )
        : 0,
      open_pull_requests:     Array.isArray(prsData) ? prsData.length : 0,
      last_commit_at:         lastRun?.created_at ?? null,
      _token_source:          'M3 Credential Management (github.personal_access_token)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (github.personal_access_token)',
    }
  }
}
