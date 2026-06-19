// lib/services/collectors/supabase.collector.ts
// L3 Deep Metrics — Supabase Management API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
// PERUBAHAN Sesi #295 — FIX field mismatch: sebelumnya return db_status/auth_status/dll
//   tapi UI deep/page.tsx expect db_active_connections/db_size_bytes/storage_used_bytes/dll.
//   Fix: panggil /health untuk status komponen + /stats untuk metrics kuantitatif.
//   Field output disesuaikan persis dengan yang di-render UI (MetricRow di SystemPanel kode=supabase).
//
// Credential: getCredentialsByProvider('supabase-management').access_token + project_ref
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
 * Field output (sesuai UI deep/page.tsx MetricRow kode=supabase):
 *   db_active_connections, db_max_connections, db_size_bytes,
 *   storage_used_bytes, auth_requests_per_min, active_sessions,
 *   edge_fn_invocations, edge_fn_error_rate_pct
 *
 * Endpoint:
 *   GET https://api.supabase.com/v1/projects/{ref}/health  → status komponen
 *   GET https://api.supabase.com/v1/projects/{ref}/database/usage → stats DB (jika tersedia)
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
      _note:         'project_ref belum dikonfigurasi di M3 (tambahkan field project_ref di M3 credential supabase-management)',
      _source:       'Integrasi > API Provider > Supabase Management API',
      _token_source: 'M3 Credential Management (supabase-management.access_token)',
    }
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }

  try {
    // Panggil /health + /database/usage secara paralel
    const [healthRes, usageRes] = await Promise.all([
      fetch(`https://api.supabase.com/v1/projects/${projectRef}/health`, { headers }),
      fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/usage`, { headers }),
    ])

    // Parse health — array of { name, status }
    const healthData = healthRes.ok ? await healthRes.json().catch(() => []) : []
    const components: Record<string, string> = {}
    if (Array.isArray(healthData)) {
      for (const item of healthData) {
        if (item?.name) components[item.name] = item.status ?? 'UNKNOWN'
      }
    }

    // Parse usage — shape varies, fallback ke 0 jika endpoint tidak tersedia
    const usageData = usageRes.ok ? await usageRes.json().catch(() => null) : null

    // db_max_connections: Supabase Free = 60 direct, Pro = 200
    // Ambil dari usage jika ada, fallback ke 60 (free tier default)
    const dbMaxConn    = usageData?.db_max_connections   ?? 60
    const dbActiveConn = usageData?.db_active_connections ?? 0
    const dbSizeBytes  = usageData?.db_size_bytes        ?? 0
    const storageBytes = usageData?.storage_size_bytes   ?? 0

    // Status komponen sebagai catatan tambahan
    const dbHealth  = components['db']             ?? 'UNKNOWN'
    const authHealth = components['auth']          ?? 'UNKNOWN'

    return {
      // Field yang di-render UI (MetricRow kode=supabase)
      db_active_connections:  dbActiveConn,
      db_max_connections:     dbMaxConn,
      db_size_bytes:          dbSizeBytes,
      storage_used_bytes:     storageBytes,
      auth_requests_per_min:  usageData?.auth_requests_per_min  ?? 0,
      active_sessions:        usageData?.active_sessions        ?? 0,
      edge_fn_invocations:    usageData?.edge_fn_invocations    ?? 0,
      edge_fn_error_rate_pct: usageData?.edge_fn_error_rate_pct ?? 0,
      // Info tambahan (tidak di-render UI tapi berguna untuk debug)
      _db_health:             dbHealth,
      _auth_health:           authHealth,
      _usage_available:       usageRes.ok,
      _token_source:          'M3 Credential Management (supabase-management.access_token)',
    }
  } catch (err) {
    return {
      _error:        String(err),
      _token_source: 'M3 Credential Management (supabase-management.access_token)',
    }
  }
}
