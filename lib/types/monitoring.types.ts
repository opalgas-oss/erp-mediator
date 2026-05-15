// lib/types/monitoring.types.ts
// Tipe data untuk PL-S09 — Monitoring Dashboard SuperAdmin
// Dipakai oleh: monitoring.repository.ts, monitoring.service.ts, MonitoringClient.tsx
// Dibuat: Sesi #151 — PL-S09

// ─── Status & Konstanta Literals ─────────────────────────────────────────────

export type MonitoringStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
export type MonitoringLayer  = 'L1' | 'L3'
export type AlertType        = 'DOWN' | 'SLOW' | 'HIGH_ERROR_RATE' | 'QUOTA_WARNING'
export type AlertChannel     = 'WA' | 'EMAIL'

// ─── Provider Metrics ─────────────────────────────────────────────────────────

export interface ProviderMetric {
  id:               string
  provider_id:      string
  checked_at:       string
  status:           MonitoringStatus
  response_time_ms: number | null
  layer:            MonitoringLayer
  metrics_json:     Record<string, unknown> | null
  error_detail:     string | null
  created_at:       string
}

export interface InsertProviderMetricPayload {
  provider_id:      string
  status:           MonitoringStatus
  response_time_ms: number | null
  layer:            MonitoringLayer
  metrics_json?:    Record<string, unknown>
  error_detail?:    string
}

// ─── Alert Rules ──────────────────────────────────────────────────────────────

export interface AlertRule {
  id:                   string
  provider_id:          string
  alert_type:           AlertType
  threshold_value:      number
  consecutive_failures: number
  cooldown_minutes:     number
  notif_channels:       AlertChannel[]
  is_active:            boolean
  created_at:           string
  updated_at:           string
  created_by:           string | null
  updated_by:           string | null
}

export interface UpdateAlertRulePayload {
  threshold_value?:      number
  consecutive_failures?: number
  cooldown_minutes?:     number
  notif_channels?:       AlertChannel[]
  is_active?:            boolean
}

// ─── Alert Log ────────────────────────────────────────────────────────────────

export interface AlertLog {
  id:             string
  rule_id:        string
  provider_id:    string
  alert_type:     AlertType
  message:        string
  notif_channels: AlertChannel[]
  sent_via_wa:    boolean
  sent_via_email: boolean
  error_wa:       string | null
  error_email:    string | null
  triggered_at:   string
}

export interface InsertAlertLogPayload {
  rule_id:        string
  provider_id:    string
  alert_type:     AlertType
  message:        string
  notif_channels: AlertChannel[]
  sent_via_wa:    boolean
  sent_via_email: boolean
  error_wa?:      string
  error_email?:   string
}

// ─── Snapshot untuk Dashboard (L1 + L4) ──────────────────────────────────────

export interface ProviderSnapshot {
  provider_id:      string
  kode:             string
  nama:             string
  kategori:         string
  status:           MonitoringStatus
  response_time_ms: number | null
  uptime_24h_pct:   number | null
  uptime_7d_pct:    number | null
  last_checked_at:  string | null
  has_active_alert: boolean
}

// ─── Deep Metrics L3 (jsonb fleksibel per sistem) ─────────────────────────────

export interface SupabaseDeepMetrics {
  db_active_connections:   number
  db_max_connections:      number
  db_size_bytes:           number
  auth_requests_per_min:   number
  active_sessions:         number
  edge_fn_invocations:     number
  edge_fn_error_rate_pct:  number
  storage_used_bytes:      number
}

export interface VercelDeepMetrics {
  last_deployment_status:   string
  last_deployment_duration: number
  fn_invocations:           number
  fn_error_rate_pct:        number
  fn_duration_p50_ms:       number
  fn_duration_p99_ms:       number
  bandwidth_bytes:          number
}

export interface UpstashDeepMetrics {
  commands_per_second: number
  memory_used_bytes:   number
  memory_max_bytes:    number
  cache_hit_rate_pct:  number
  latency_p99_ms:      number
}

export interface CloudinaryDeepMetrics {
  storage_used_bytes:  number
  storage_max_bytes:   number
  bandwidth_bytes:     number
  bandwidth_max_bytes: number
  api_calls:           number
  api_calls_max:       number
}

export interface GithubDeepMetrics {
  last_workflow_status:   string
  last_workflow_duration: number
  open_pull_requests:     number
  last_commit_at:         string
}

// ─── SSE Event ────────────────────────────────────────────────────────────────

export interface MetricSSEEvent {
  type:       'metric_update' | 'heartbeat'
  provider_id?: string
  status?:      MonitoringStatus
  response_time_ms?: number | null
  checked_at?:  string
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface MonitoringSnapshotResponse {
  success:   boolean
  data:      ProviderSnapshot[]
  updatedAt: string
}

export interface AlertRulesResponse {
  success: boolean
  data:    AlertRule[]
}

export interface AlertLogsResponse {
  success: boolean
  data:    AlertLog[]
  total:   number
}
