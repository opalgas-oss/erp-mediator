// lib/services/alert.service.ts
// Service: cek threshold + enqueue notifikasi WA + Email via Redis (M6)
// Dipakai oleh: metrics-collector.service.ts (setelah setiap batch metrics)
// Dibuat: Sesi #151
// PERUBAHAN S#333: M3 Deduplication (dedup_key, incrementAlertOccurrence)
// PERUBAHAN S#334: M6 Alert Queue
//   - evaluateRule() enqueue ke Redis (WA + Email) vs kirim langsung
//   - insertAlertLog() dipanggil SEBELUM enqueue agar alertLogId tersedia untuk DLQ
//   - sendWAAlert() + sendEmailAlert() dihapus dari file ini (ada di alert-queue.service)
// PERUBAHAN S#336: M4 Maintenance Window
//   - evaluateRule() cek findActiveWindow() sebelum enqueue
//   - Jika window aktif → insert alert_log status SUPPRESSED, tidak enqueue
// PERUBAHAN S#337: FIX-2+3+4 — hapus semua hardcode pesan ke message_library
//   FIX-2: buildAlertMessage() baca template dari message_library key alert.wa.incident_triggered
//   FIX-3: subject email baca dari message_library key alert.email.incident_subject
//   FIX-4: pesan SUPPRESSED baca dari message_library key alert.log.suppressed_message
//
// PENTING: Tidak ada hardcode credential, nomor kontak, atau teks pesan di file ini.
// Semua credential dari M3 DB via credential.service.
// Semua teks pesan dari message_library (LL#11).
// Target notifikasi dari config_registry.

import 'server-only'
import { getConfigValues }     from '@/lib/config-registry'
import { getMessage, interpolate } from '@/lib/message-library'
import { findRulesByProvider } from '@/lib/repositories/alert-rules.repository'
import {
  findLastAlertAt,
  insertAlertLog,
  findOpenAlertByDedupKey,
  incrementAlertOccurrence,
} from '@/lib/repositories/alert-log.repository'
import { findRecentByProvider }    from '@/lib/repositories/provider-metrics.repository'
import { autoResolveAlert }        from '@/lib/services/alert-lifecycle.service'
import { enqueueWA, enqueueEmail } from '@/lib/services/alert-queue.service'
import { findActiveWindow }        from '@/lib/repositories/maintenance-window.repository'
import type { MonitoringStatus }   from '@/lib/types/monitoring.types'
import { MONITORING_STATUS, ALERT_TYPE } from '@/lib/constants/monitoring.constant'

// ─── getAlertTarget ───────────────────────────────────────────────────────────

async function getAlertTarget(): Promise<{ waNumber: string | null; email: string | null }> {
  const cfg = await getConfigValues('monitoring')
  return {
    waNumber: cfg['superadmin_alert_wa_number'] || null,
    email:    cfg['superadmin_alert_email']    || null,
  }
}

// ─── checkAndSendAlerts ───────────────────────────────────────────────────────

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

// ─── evaluateRule (internal) ──────────────────────────────────────────────────

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

  // M4: Cek maintenance window aktif — jika ada, suppress notifikasi
  // FIX-4: pesan SUPPRESSED dari message_library key alert.log.suppressed_message
  const activeWindow = await findActiveWindow(providerId)
  if (activeWindow) {
    const suppressedTpl = await getMessage('alert.log.suppressed_message')
    const suppressedMsg = interpolate(suppressedTpl, { window_name: activeWindow.name })
    await insertAlertLog({
      rule_id:        rule.id,
      provider_id:    providerId,
      alert_type:     rule.alert_type,
      message:        suppressedMsg,
      notif_channels: rule.notif_channels,
      sent_via_wa:    false,
      sent_via_email: false,
      status:         'SUPPRESSED',
      dedup_key:      dedupKey,
    })
    return
  }

  const { waNumber, email } = await getAlertTarget()
  const incidentUrl = buildIncidentUrl()

  // FIX-2: message WA dari message_library key alert.wa.incident_triggered
  const message = await buildAlertMessage(providerId, rule.alert_type, incidentUrl)

  // M6: Insert log DULU agar alertLogId tersedia untuk referensi DLQ di queue
  const newAlertId = await insertAlertLog({
    rule_id:        rule.id,
    provider_id:    providerId,
    alert_type:     rule.alert_type,
    message,
    notif_channels: rule.notif_channels,
    sent_via_wa:    false,
    sent_via_email: false,
    status:         'TRIGGERED',
    dedup_key:      dedupKey,
  })

  // Ambil config delay Fonnte dari config_registry
  const alertCfg    = await getConfigValues('alert.fonnte_delay_seconds')
  const fonnteDelay = parseInt(alertCfg['alert.fonnte_delay_seconds'] ?? '2', 10)

  // FIX-3: subject email dari message_library key alert.email.incident_subject
  const emailSubject = await getMessage('alert.email.incident_subject')

  // M6: Enqueue ke Redis — tidak kirim langsung
  const enqueueJobs: Promise<boolean>[] = []

  if (rule.notif_channels.includes('WA') && waNumber) {
    enqueueJobs.push(
      enqueueWA({
        alertLogId:   newAlertId,
        targetNumber: waNumber,
        message,
        delaySeconds: fonnteDelay,
      })
    )
  }

  if (rule.notif_channels.includes('EMAIL') && email) {
    enqueueJobs.push(
      enqueueEmail({
        alertLogId:  newAlertId,
        targetEmail: email,
        subject:     emailSubject,
        message,
      })
    )
  }

  if (enqueueJobs.length > 0) {
    await Promise.allSettled(enqueueJobs)
  }
}

// ─── checkRuleTrigger ─────────────────────────────────────────────────────────

function checkRuleTrigger(
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

function buildIncidentUrl(alertLogId?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (alertLogId) {
    return `${base}/dashboard/superadmin/monitoring/incidents/${alertLogId}`
  }
  return `${base}/dashboard/superadmin/monitoring`
}

// ─── buildAlertMessage ────────────────────────────────────────────────────────

/**
 * Bangun pesan WA alert dari message_library key alert.wa.incident_triggered.
 * FIX-2 S#337: sebelumnya hardcode template di sini — sekarang dari message_library.
 *
 * Template: "*{provider_name}* tidak bisa dihubungi ({alert_type}). Lihat detail: {incident_url}"
 * SA bisa ubah template dari Dashboard → Modul Pesan tanpa deploy ulang.
 */
async function buildAlertMessage(
  providerId:  string,
  alertType:   string,
  incidentUrl: string
): Promise<string> {
  const tpl = await getMessage('alert.wa.incident_triggered')
  return interpolate(tpl, {
    provider_name: providerId,
    alert_type:    alertType,
    incident_url:  incidentUrl,
  })
}
