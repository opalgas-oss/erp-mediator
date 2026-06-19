// lib/services/collectors/supabase.collector.ts
// L3 Deep Metrics — Supabase
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)
// PERUBAHAN Sesi #295 — FIX field mismatch: sebelumnya return db_status/auth_status/dll
// PERUBAHAN Sesi #297 — FIX db_size_bytes + storage_used_bytes selalu 0:
//   Endpoint /database/usage tidak exist di Management API → ganti dengan RPC SQL
//   via monitoring.collect_metrics() menggunakan project_url + service_role_key dari
//   provider 'supabase'. Management API /health tetap dipakai untuk status komponen.
//   Tambah active_connections dari RPC (lebih akurat dari stat kumulatif).
//
// Credential yang dibutuhkan:
//   Dari provider 'supabase-management': access_token, project_ref  → /health endpoint
//   Dari provider 'supabase': project_url, service_role_key         → RPC collect_metrics()
//
// Anti-hardcode: semua credential dari M3, tidak ada process.env di file ini.

import 'server-only'

/**
 * Kumpulkan deep metrics Supabase.
 *
 * @param mgmtCreds  - Credential dari provider 'supabase-management' (access_token, project_ref)
 * @param appCreds   - Credential dari provider 'supabase' (project_url, service_role_key)
 *
 * Field output (sesuai UI deep/page.tsx MetricRow kode=supabase):
 *   db_active_connections, db_max_connections, db_size_bytes,
 *   storage_used_bytes, auth_requests_per_min, active_sessions,
 *   edge_fn_invocations, edge_fn_error_rate_pct
 */
export async function collectSupabaseMetrics(
  mgmtCreds: Record<string, string>,
  appCreds:  Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const token      = mgmtCreds['access_token']
  const projectRef = mgmtCreds['project_ref']
  const projectUrl = appCreds['project_url']
  const serviceKey = appCreds['service_role_key']

  // ── 1. RPC collect_metrics() via project_url + service_role_key ──────────────
  // Ambil db_size_bytes, active_connections, storage_used_bytes langsung dari DB
  // via monitoring.collect_metrics() SECURITY DEFINER function (statement_timeout=5s).
  // Ini adalah sumber data paling akurat — langsung query pg_database_size() + storage.objects.

  let dbSizeBytes     = 0
  let activeConn      = 0
  let storageBytes    = 0
  let rpcOk           = false

  if (projectUrl && serviceKey) {
    try {
      const rpcRes = await fetch(`${projectUrl}/rest/v1/rpc/collect_metrics`, {
        method:  'POST',
        headers: {
          'apikey':        serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type':  'application/json',
        },
        body: '{}',
        signal: AbortSignal.timeout(8_000),
      })

      if (rpcRes.ok) {
        const rpcData = await rpcRes.json().catch(() => null)
        if (rpcData && typeof rpcData === 'object') {
          dbSizeBytes  = Number(rpcData.db_size_bytes)      || 0
          activeConn   = Number(rpcData.active_connections) || 0
          storageBytes = Number(rpcData.storage_used_bytes) || 0
          rpcOk        = true
        }
      }
    } catch {
      // RPC gagal — fallback ke 0, tidak throw
    }
  }

  // ── 2. Management API /health — status komponen (db, auth, dll) ──────────────
  // Tetap dipakai untuk _db_health + _auth_health (informasi status layanan Supabase).
  // Tidak mengambil angka usage dari sini — endpoint usage tidak exist.

  let dbHealth   = 'UNKNOWN'
  let authHealth = 'UNKNOWN'

  if (token && projectRef) {
    try {
      const healthRes = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/health`,
        {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          signal:  AbortSignal.timeout(8_000),
        }
      )
      if (healthRes.ok) {
        const healthData = await healthRes.json().catch(() => [])
        if (Array.isArray(healthData)) {
          for (const item of healthData) {
            if (item?.name === 'db')   dbHealth   = item.status ?? 'UNKNOWN'
            if (item?.name === 'auth') authHealth = item.status ?? 'UNKNOWN'
          }
        }
      }
    } catch {
      // Health check gagal — status tetap UNKNOWN
    }
  }

  // ── 3. Return semua field ─────────────────────────────────────────────────────

  return {
    // Field utama — di-render UI (MetricRow kode=supabase di deep/page.tsx)
    db_active_connections:  activeConn,
    db_max_connections:     60,   // Free tier default — dikonfigurasi SA via capacity_supabase_connections
    db_size_bytes:          dbSizeBytes,
    storage_used_bytes:     storageBytes,
    auth_requests_per_min:  0,    // TODO: ambil dari Management API analytics jika diperlukan
    active_sessions:        0,    // TODO: ambil dari auth.sessions jika diperlukan
    edge_fn_invocations:    0,    // TODO: ambil dari Management API analytics jika diperlukan
    edge_fn_error_rate_pct: 0,

    // Info debug (tidak di-render UI — terlihat di raw metrics_json)
    _db_health:      dbHealth,
    _auth_health:    authHealth,
    _rpc_available:  rpcOk,
    _token_source:   'M3 Credential Management (supabase-management.access_token + supabase.service_role_key)',
  }
}
