// lib/services/monitoring.service.ts
// Service: snapshot data L1+L4 untuk dashboard
// Dipakai oleh: GET /api/monitoring/metrics, GET /api/monitoring/alert-rules
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard

import {
  findLatestMetricsPerProvider,
  computeUptimePct,
} from '@/lib/repositories/provider-metrics.repository'
import {
  findAllAlertRules,
  findAlertRuleById,
  updateAlertRule,
} from '@/lib/repositories/alert-rules.repository'
import {
  findRecentAlertLogs,
  countActiveAlertProviders,
} from '@/lib/repositories/alert-log.repository'
import type {
  ProviderSnapshot,
  AlertRule,
  AlertRuleWithProvider,
  AlertLog,
  UpdateAlertRulePayload,
} from '@/lib/types/monitoring.types'

// ─── getMonitoringSnapshot ────────────────────────────────────────────────────

export async function getMonitoringSnapshot(): Promise<{
  systems:       ProviderSnapshot[]
  alertCount:    number
  updatedAt:     string
}> {
  const [systems, alertCount] = await Promise.all([
    findLatestMetricsPerProvider(),
    countActiveAlertProviders(),
  ])

  const enriched = await Promise.all(
    systems.map(async sys => {
      const [uptime24h, uptime7d] = await Promise.all([
        computeUptimePct(sys.provider_id, 24),
        computeUptimePct(sys.provider_id, 168),
      ])
      return { ...sys, uptime_24h_pct: uptime24h, uptime_7d_pct: uptime7d }
    })
  )

  return {
    systems:    enriched,
    alertCount,
    updatedAt:  new Date().toISOString(),
  }
}

// ─── getAlertRules ────────────────────────────────────────────────────────────

export async function getAlertRules(): Promise<AlertRuleWithProvider[]> {
  return findAllAlertRules()
}

// ─── patchAlertRule ───────────────────────────────────────────────────────────

export async function patchAlertRule(
  id:        string,
  payload:   UpdateAlertRulePayload,
  updatedBy: string
): Promise<AlertRule> {
  const existing = await findAlertRuleById(id)
  if (!existing) throw new Error('Alert rule tidak ditemukan')

  if (payload.threshold_value !== undefined && payload.threshold_value <= 0) {
    throw new Error('Threshold value harus lebih dari 0')
  }
  if (payload.consecutive_failures !== undefined && payload.consecutive_failures < 1) {
    throw new Error('Consecutive failures minimal 1')
  }
  if (payload.cooldown_minutes !== undefined && payload.cooldown_minutes < 5) {
    throw new Error('Cooldown minimal 5 menit')
  }

  const VALID_SEVERITY = ['CRITICAL', 'WARNING', 'INFO'] as const
  if (payload.severity !== undefined && !(VALID_SEVERITY as readonly string[]).includes(payload.severity)) {
    throw new Error('Severity harus CRITICAL, WARNING, atau INFO')
  }

  return updateAlertRule(id, payload, updatedBy)
}

// ─── getRecentAlertLogs ───────────────────────────────────────────────────────

export async function getRecentAlertLogs(limit: number = 10): Promise<AlertLog[]> {
  return findRecentAlertLogs(limit)
}
