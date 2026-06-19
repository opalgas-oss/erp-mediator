// ARSIP pra-fix Sesi #295 — supabase.collector.ts
// Bug: return field db_status/auth_status/dll tapi UI expect db_active_connections/db_size_bytes/dll
// lib/services/collectors/supabase.collector.ts
// L3 Deep Metrics — Supabase Management API
// Dipanggil oleh: metrics-collector.service.ts → collectDeepMetrics()
// Dibuat: Sesi #295 — HUTANG-SPLIT-COLLECTOR (pecah dari metrics-collector.service.ts)

import 'server-only'

export async function collectSupabaseMetrics(
  creds: Record<string, string>
): Promise<Record<string, unknown>> {
  const token      = creds['access_token']
  const projectRef = creds['project_ref']

  if (!token) return { _note: 'access_token belum dikonfigurasi di M3', _source: 'Integrasi > API Provider > Supabase Management API' }
  if (!projectRef) return { _note: 'project_ref belum dikonfigurasi di M3', _source: 'Integrasi > API Provider > Supabase Management API', _token_source: 'M3 Credential Management (supabase-management.access_token)' }

  // return db_status, auth_status, dll — TIDAK MATCH UI yang expect db_active_connections
  return { db_status: 'UNKNOWN', auth_status: 'UNKNOWN', _token_source: 'M3' }
}
