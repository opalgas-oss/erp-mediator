// lib/constants/monitoring.constant.ts
// Konstanta untuk PL-S09 Monitoring Dashboard
// Dipakai oleh: alert.service.ts, metrics-collector.service.ts, monitoring.types.ts
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard

// ─── Status sistem yang dipantau ──────────────────────────────────────────────

export const MONITORING_STATUS = {
  UP:       'UP',
  DOWN:     'DOWN',
  DEGRADED: 'DEGRADED',
  UNKNOWN:  'UNKNOWN',
} as const

// ─── Tipe alert ───────────────────────────────────────────────────────────────

export const ALERT_TYPE = {
  DOWN:            'DOWN',
  SLOW:            'SLOW',
  HIGH_ERROR_RATE: 'HIGH_ERROR_RATE',
  QUOTA_WARNING:   'QUOTA_WARNING',
} as const

// ─── Channel notifikasi ───────────────────────────────────────────────────────

export const ALERT_CHANNEL = {
  WA:    'WA',
  EMAIL: 'EMAIL',
} as const

// ─── Layer monitoring ─────────────────────────────────────────────────────────

export const MONITORING_LAYER = {
  L1: 'L1',   // ping health — setiap 1 menit
  L3: 'L3',   // deep check — setiap 15 menit
} as const
