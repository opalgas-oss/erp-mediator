// lib/services/alert-helpers.service.ts
// Helper internal untuk alert.service.ts
// Dipecah dari alert.service.ts (S#347 ATURAN 9 — file >10 KB)
//
// Konten:
//   - getAlertTarget()    — ambil penerima dari config_registry (multi-value)
//   - checkRuleTrigger()  — evaluasi apakah rule terpicu berdasarkan status/response time
//   - buildIncidentUrl()  — bangun URL incident untuk pesan alert
//   - buildAlertMessage() — bangun teks pesan WA dari message_library
//
// Dibuat: Sesi #347

import 'server-only'
import { getConfigValues }         from '@/lib/config-registry'
import { getMessage, interpolate } from '@/lib/message-library'
import type { MonitoringStatus }   from '@/lib/types/monitoring.types'
import { MONITORING_STATUS, ALERT_TYPE } from '@/lib/constants/monitoring.constant'

// ─── getAlertTarget ───────────────────────────────────────────────────────────
// FIX-B2-MULTI-RECIPIENT S#347: return arrays dari comma-separated string di config_registry

export async function getAlertTarget(): Promise<{ waNumbers: string[]; emails: string[] }> {
  const cfg = await getConfigValues('monitoring')
  const waRaw    = cfg['superadmin_alert_wa_number'] ?? ''
  const emailRaw = cfg['superadmin_alert_email']    ?? ''
  return {
    waNumbers: waRaw.split(',').map((s) => s.trim()).filter(Boolean),
    emails:    emailRaw.split(',').map((s) => s.trim()).filter(Boolean),
  }
}

// ─── checkRuleTrigger ─────────────────────────────────────────────────────────

export function checkRuleTrigger(
  alertType:      string,
  status:         MonitoringStatus,
  responseTimeMs: number | null,
  threshold:      number
): boolean {
  switch (alertType) {
    case ALERT_TYPE.DOWN:            return status === MONITORING_STATUS.DOWN
    case ALERT_TYPE.SLOW:            return responseTimeMs !== null && responseTimeMs > threshold
    case ALERT_TYPE.HIGH_ERROR_RATE: return status === MONITORING_STATUS.DEGRADED
    case ALERT_TYPE.QUOTA_WARNING:   return status === MONITORING_STATUS.DEGRADED
    default:                         return false
  }
}

// ─── buildIncidentUrl ─────────────────────────────────────────────────────────

export function buildIncidentUrl(alertLogId?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (alertLogId) {
    return `${base}/dashboard/superadmin/monitoring/incidents/${alertLogId}`
  }
  return `${base}/dashboard/superadmin/monitoring`
}

// ─── buildAlertMessage ────────────────────────────────────────────────────────

/**
 * Bangun pesan WA alert dari message_library key alert.wa.incident_triggered.
 * FIX-2 S#337: sebelumnya hardcode template — sekarang dari message_library.
 * S#356 E-1: param providerNama = nama asli provider (mis. "Resend"), BUKAN UUID.
 *   Formatter murni — nama di-resolve caller (evaluateRule dari rule.provider_nama).
 * Template: "*{provider_name}* tidak bisa dihubungi ({alert_type}). Lihat detail: {incident_url}"
 */
export async function buildAlertMessage(
  providerNama: string,
  alertType:    string,
  incidentUrl:  string
): Promise<string> {
  const tpl = await getMessage('alert.wa.incident_triggered')
  return interpolate(tpl, {
    provider_name: providerNama,
    alert_type:    alertType,
    incident_url:  incidentUrl,
  })
}
