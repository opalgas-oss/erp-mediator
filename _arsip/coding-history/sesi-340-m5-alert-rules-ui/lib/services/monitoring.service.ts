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
  AlertLog,
  UpdateAlertRulePayload,
} from '@/lib/types/monitoring.types'

// ─── getMonitoringSnapshot ────────────────────────────────────────────────────

/**
 * Ambil snapshot lengkap semua sistem untuk dashboard L1 + L4.
 * Include: status terbaru, uptime 24h, uptime 7d, has_active_alert.
 */
export async function getMonitoringSnapshot(): Promise<{
  systems:       ProviderSnapshot[]
  alertCount:    number
  updatedAt:     string
}> {
  const [systems, alertCount] = await Promise.all([
    findLatestMetricsPerProvider(),
    countActiveAlertProviders(),
  ])

  // Enrich dengan uptime 24h dan 7d
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

/**
 * Ambil semua alert rules untuk tampilan form pengaturan dashboard.
 */
export async function getAlertRules(): Promise<AlertRule[]> {
  return findAllAlertRules()
}

// ─── patchAlertRule ───────────────────────────────────────────────────────────

/**
 * Update satu alert rule dari form pengaturan SuperAdmin.
 * Validasi sederhana: threshold_value harus positif.
 */
export async function patchAlertRule(
  id:        string,
  payload:   UpdateAlertRulePayload,
  updatedBy: string
): Promise<AlertRule> {
  // Validasi
  const existing = await findAlertRuleById(id)
  if (!existing) throw new Error('Alert rule tidak ditemukan')

  if (
    payload.threshold_value !== undefined &&
    payload.threshold_value <= 0
  ) {
    throw new Error('Threshold value harus lebih dari 0')
  }

  if (
    payload.consecutive_failures !== undefined &&
    payload.consecutive_failures < 1
  ) {
    throw new Error('Consecutive failures minimal 1')
  }

  if (
    payload.cooldown_minutes !== undefined &&
    payload.cooldown_minutes < 5
  ) {
    throw new Error('Cooldown minimal 5 menit')
  }

  return updateAlertRule(id, payload, updatedBy)
}

// ─── getRecentAlertLogs ───────────────────────────────────────────────────────

/**
 * Ambil riwayat alert untuk Layer 5 dashboard.
 */
export async function getRecentAlertLogs(limit: number = 10): Promise<AlertLog[]> {
  return findRecentAlertLogs(limit)
}
