// lib/services/alert.service.ts
// Service: cek threshold + enqueue notifikasi WA + Email via Redis (M6)
// Dipakai oleh: metrics-collector.service.ts (setelah setiap batch metrics)
// Dibuat: Sesi #151
// PERUBAHAN S#333: M3 Deduplication (dedup_key, incrementAlertOccurrence)
// PERUBAHAN S#334: M6 Alert Queue (enqueue ke Redis, bukan kirim langsung)
// PERUBAHAN S#336: M4 Maintenance Window (suppress jika window aktif)
// PERUBAHAN S#337: FIX-2+3+4 (semua teks dari message_library)
// PERUBAHAN S#347: FIX-B2-MULTI-RECIPIENT — loop per penerima WA + Email
//   Helper dipecah ke: alert-helpers.service.ts (ATURAN 9 — file >10KB)
//
// PENTING: Tidak ada hardcode credential, nomor kontak, atau teks pesan di file ini.

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
import { isQuietHour }             from '@/lib/helpers/alert-quiet-hours.helper'
import type { MonitoringStatus }   from '@/lib/types/monitoring.types'
import { MONITORING_STATUS }       from '@/lib/constants/monitoring.constant'
import {
  getAlertTarget,
  checkRuleTrigger,
  buildIncidentUrl,
  buildAlertMessage,
} from '@/lib/services/alert-helpers.service'

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

  // M4: Cek maintenance window — suppress jika window aktif
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

  // B2: Filter quiet hours (CRITICAL selalu dikirim, WARNING/INFO tidak)
  if (rule.severity !== 'CRITICAL') {
    const quietNow = await isQuietHour()
    if (quietNow) {
      const cfgQH     = await getConfigValues('monitoring')
      const startHour = cfgQH['alert.quiet_hours_start'] ?? '22'
      const endHour   = cfgQH['alert.quiet_hours_end']   ?? '6'
      const quietTpl  = await getMessage('alert.log.quiet_hour_message')
      const quietMsg  = interpolate(quietTpl, {
        alert_type:    rule.alert_type,
        provider_name: rule.provider_nama,
        start_hour:    startHour,
        end_hour:      endHour,
      })
      await insertAlertLog({
        rule_id:        rule.id,
        provider_id:    providerId,
        alert_type:     rule.alert_type,
        message:        quietMsg,
        notif_channels: rule.notif_channels,
        sent_via_wa:    false,
        sent_via_email: false,
        status:         'SUPPRESSED',
        dedup_key:      dedupKey,
      })
      return
    }
  }

  const { waNumbers, emails } = await getAlertTarget()
  const incidentUrl = buildIncidentUrl()

  // Guard: tidak ada penerima terdaftar
  const hasWA    = rule.notif_channels.includes('WA')    && waNumbers.length > 0
  const hasEmail = rule.notif_channels.includes('EMAIL') && emails.length > 0
  if (!hasWA && !hasEmail) {
    console.warn(`[evaluateRule] Tidak ada penerima untuk provider ${providerId} — alert tidak dikirim`)
    return
  }

  const message      = await buildAlertMessage(rule.provider_nama, rule.alert_type, incidentUrl)

  // Insert log DULU agar alertLogId tersedia untuk referensi DLQ
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

  const alertCfg    = await getConfigValues('alert.fonnte_delay_seconds')
  const fonnteDelay = parseInt(alertCfg['alert.fonnte_delay_seconds'] ?? '2', 10)
  const emailSubject = await getMessage('alert.email.incident_subject')

  // Loop per penerima — enqueueWA/enqueueEmail interface tidak diubah (single target)
  const enqueueJobs: Promise<boolean>[] = []

  if (hasWA) {
    for (const targetNumber of waNumbers) {
      enqueueJobs.push(
        enqueueWA({ alertLogId: newAlertId, targetNumber, message, delaySeconds: fonnteDelay })
      )
    }
  }

  if (hasEmail) {
    for (const targetEmail of emails) {
      enqueueJobs.push(
        enqueueEmail({ alertLogId: newAlertId, targetEmail, subject: emailSubject, message })
      )
    }
  }

  if (enqueueJobs.length > 0) {
    await Promise.allSettled(enqueueJobs)
  }
}
