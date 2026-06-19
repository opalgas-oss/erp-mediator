// lib/services/collectors/supabase.collector.ts
// L3 Deep Metrics — Supabase Management API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
//
// Credential: getCredentialsByProvider('supabase-management').access_token
// Dikonfigurasi SuperAdmin di: Integrasi > API Provider > Supabase Management API
// Anti-hardcode: semua credential dari M3, tidak ada process.env di file ini.

import 'server-only'

/**
 * Kumpulkan deep metrics Supabase via Management API.
 *
 * Credential yang dibutuhkan (dari M3):
 *   - access_token: Personal Access Token dari dashboard.supabase.com/account/tokens
 *   - project_ref:  Reference ID project (mis. abcdefghijklmnop)
 *
 * Endpoint target:
 *   GET https://api.supabase.com/v1/projects/{ref}/health
 *   GET https://api.supabase.com/v1/projects/{ref}/usage (jika tersedia)
 */
export async function collectSupabaseMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const token      = creds['access_token']
  const projectRef = creds['project_ref']

  if (!token) {
    return {
      _note:   'access_token belum dikonfigurasi di M3',
      _source: 'Integrasi > API Provider > Supabase Management API',
    }
  }

  if (!projectRef) {
    return {
      _note:         'project_ref belum dikonfigurasi di M3',
      _source:       'Integrasi > API Provider > Supabase Management API',
      _token_source: 'M3 Credential Management (supabase-management.access_token)',
    }
  }

  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    }

    // GET /v1/projects/{ref}/health — status komponen DB, Auth, Storage, Edge Functions
    const healthRes = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/health`,
      { headers }
    )

    if (!healthRes.ok) {
      return {
        _error:        `Management API error ${healthRes.status}`,
        _token_source: 'M3 Credential Management (supabase-management.access_token)',
      }
    }

    const healthData = await healthRes.json()

    // healthData: array of { name, status, error? }
    // Contoh: [{ name: 'db', status: 'ACTIVE_HEALTHY' }, { name: 'auth', status: 'ACTIVE_HEALTHY' }]
    const components: Record<string, string> = {}
    if (Array.isArray(healthData)) {
      for (const item of healthData) {
        if (item?.name) components[item.name] = item.status ?? 'UNKNOWN'
      }
    }

    return {
      db_status:       components['db']              ?? 'UNKNOWN',
      auth_status:     components['auth']            ?? 'UNKNOWN',
      storage_status:  components['storage']         ?? 'UNKNOWN',
      realtime_status: components['realtime']        ?? 'UNKNOWN',
      edge_fn_status:  components['edge_functions']  ?? 'UNKNOWN',
      _raw_health:     healthData,
      _token_source:   'M3 Credential Management (supabase-management.access_token)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (supabase-management.access_token)',
    }
  }
}
