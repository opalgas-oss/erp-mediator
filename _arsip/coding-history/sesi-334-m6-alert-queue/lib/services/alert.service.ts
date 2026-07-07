// ARSIP — Sesi #334 — sebelum M6 Alert Queue
// File asli: lib/services/alert.service.ts
// Alasan arsip: integrasi M6 queue Redis (enqueue WA+Email di evaluateRule)
// lib/services/alert.service.ts
// Service: cek threshold + kirim notifikasi WA + Email
// Dipakai oleh: metrics-collector.service.ts (setelah setiap batch metrics)
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
// PERUBAHAN Sesi #333 — M3 Deduplication:
//   evaluateRule(): cek dedup_key sebelum insert
//   Jika insiden terbuka (TRIGGERED/ACKNOWLEDGED): increment occurrence_count, tidak insert baru
//   Jika tidak ada: insert baru + ID aktual tersedia dari insertAlertLog() return string
//   alertLogPlaceholderId() dihapus — tidak lagi diperlukan
//
// PENTING: Tidak ada hardcode credential atau nomor kontak di file ini.
// Semua credential diambil dari M3 DB via credential.service.ts (ATURAN 11 — anti duplikasi).
// Semua target notifikasi diambil dari config_registry (ATURAN 8 — anti hardcode).

import 'server-only'
import { getCredential }      from '@/lib/services/credential.service'
import { getConfigValues, getPlatformTimezone } from '@/lib/config-registry'
import { findRulesByProvider } from '@/lib/repositories/alert-rules.repository'
import { findLastAlertAt, insertAlertLog, findOpenAlertByDedupKey, incrementAlertOccurrence } from '@/lib/repositories/alert-log.repository'
import { findRecentByProvider }            from '@/lib/repositories/provider-metrics.repository'
import { sendFonnteWA }                    from '@/lib/utils/fonnte.server'
import { sendResendEmailPlain }             from '@/lib/utils/resend.server'
import { autoResolveAlert }                from '@/lib/services/alert-lifecycle.service'
import type { MonitoringStatus }           from '@/lib/types/monitoring.types'
import { MONITORING_STATUS, ALERT_TYPE }   from '@/lib/constants/monitoring.constant'

async function getAlertTarget(): Promise<{ waNumber: string | null; email: string | null }> {
  const cfg = await getConfigValues('monitoring')
  return {
    waNumber: cfg['superadmin_alert_wa_number'] || null,
    email:    cfg['superadmin_alert_email']    || null,
  }
}

export async function checkAndSendAlerts(
  providerId:     string,
  currentStatus:  MonitoringStatus,
  responseTimeMs: number | null
): Promise<void> {
  if (currentStatus === MONITORING_STATUS.UP) {
    const dedupKeyDown = `${providerId}:DOWN:TRIGGERED`
    const dedupKeySlow = `${providerId}:SLOW:TRIGGERED`
    await Promise.allSettled([
      autoResolveAlert(dedupKeyDown),
      autoResolveAlert(dedupKeySlow),
    ])
  }

  const rules = await findRulesByProvider(providerId)
  if (rules.length === 0) return

  await Promise.allSettled(
    rules.map(rule => evaluateRule(providerId, currentStatus, responseTimeMs, rule))
  )
}

async function evaluateRule(
  providerId:     string,
  currentStatus:  MonitoringStatus,
  responseTimeMs: number | null,
  rule: Awaited<ReturnType<typeof findRulesByProvider>>[number]
): Promise<void> {
  const isTriggered = checkRuleTrigger(rule.alert_type, currentStatus, responseTimeMs, rule.threshold_value)
  if (!isTriggered) return

  const recentMetrics = await findRecentByProvider(providerId, 60)
  const lastN = recentMetrics.slice(-rule.consecutive_failures)
  const allFailed =
    lastN.length === rule.consecutive_failures &&
    lastN.every(m => checkRuleTrigger(rule.alert_type, m.status, m.response_time_ms, rule.threshold_value))
  if (!allFailed) return

  const lastAlertAt = await findLastAlertAt(rule.id, rule.alert_type)
  if (lastAlertAt) {
    const elapsed = Date.now() - new Date(lastAlertAt).getTime()
    if (elapsed < rule.cooldown_minutes * 60 * 1000) return
  }

  const dedupKey = `${providerId}:${rule.alert_type}:TRIGGERED`
  const existingOpen = await findOpenAlertByDedupKey(dedupKey)
  if (existingOpen) {
    await incrementAlertOccurrence(existingOpen.id)
    return
  }

  const { waNumber, email } = await getAlertTarget()
  const incidentUrl = buildIncidentUrl()
  const message = await buildAlertMessage(providerId, rule.alert_type, currentStatus, responseTimeMs, incidentUrl)

  const [resultWa, resultEmail] = await Promise.allSettled([
    rule.notif_channels.includes('WA') && waNumber
      ? sendWAAlert(message, waNumber)
      : Promise.resolve(null),
    rule.notif_channels.includes('EMAIL') && email
      ? sendEmailAlert(message, email)
      : Promise.resolve(null),
  ])

  const newAlertId = await insertAlertLog({
    rule_id:        rule.id,
    provider_id:    providerId,
    alert_type:     rule.alert_type,
    message,
    notif_channels: rule.notif_channels,
    sent_via_wa:    resultWa.status    === 'fulfilled' && resultWa.value    !== null,
    sent_via_email: resultEmail.status === 'fulfilled' && resultEmail.value !== null,
    error_wa:       resultWa.status    === 'rejected'  ? String(resultWa.reason)    : undefined,
    error_email:    resultEmail.status === 'rejected'  ? String(resultEmail.reason) : undefined,
    status:         'TRIGGERED',
    dedup_key:      dedupKey,
  })
  void newAlertId
}

function checkRuleTrigger(alertType: string, status: MonitoringStatus, responseTimeMs: number | null, threshold: number): boolean {
  switch (alertType) {
    case ALERT_TYPE.DOWN:             return status === MONITORING_STATUS.DOWN
    case ALERT_TYPE.SLOW:             return responseTimeMs !== null && responseTimeMs > threshold
    case ALERT_TYPE.HIGH_ERROR_RATE:  return status === MONITORING_STATUS.DEGRADED
    case ALERT_TYPE.QUOTA_WARNING:    return status === MONITORING_STATUS.DEGRADED
    default:                          return false
  }
}

function buildIncidentUrl(alertLogId?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (alertLogId) return `${base}/dashboard/superadmin/monitoring/incidents/${alertLogId}`
  return `${base}/dashboard/superadmin/monitoring`
}

async function buildAlertMessage(providerId: string, alertType: string, status: MonitoringStatus, responseTimeMs: number | null, incidentUrl: string): Promise<string> {
  const timezone = await getPlatformTimezone()
  const time = new Date().toLocaleString('id-ID', { timeZone: timezone })
  const ms   = responseTimeMs !== null ? ` (${responseTimeMs}ms)` : ''
  return (
    `[ERP Mediator Alert] ${time} WIB\n` +
    `Provider: ${providerId}\n` +
    `Tipe: ${alertType} — Status: ${status}${ms}\n` +
    `Sistem memerlukan perhatian SuperAdmin.\n` +
    `Detail: ${incidentUrl}`
  )
}

async function sendWAAlert(message: string, targetNumber: string): Promise<boolean> {
  const token = await getCredential('fonnte', 'api_token')
  if (!token) throw new Error('Token Fonnte belum dikonfigurasi di M3 Credential Management')
  if (!targetNumber) throw new Error('Nomor WA penerima alert belum dikonfigurasi di Config Registry')
  const result = await sendFonnteWA(targetNumber, message, token)
  if (!result.success) throw new Error(`Fonnte error: ${result.reason ?? 'Unknown error'}`)
  return true
}

async function sendEmailAlert(message: string, targetEmail: string): Promise<boolean> {
  if (!targetEmail) throw new Error('Email penerima alert belum dikonfigurasi di Config Registry')
  const result = await sendResendEmailPlain(targetEmail, '[ERP Mediator] Alert Sistem Monitoring', message)
  if (!result.success) throw new Error(`Resend error: ${result.reason ?? 'Unknown error'}`)
  return true
}
