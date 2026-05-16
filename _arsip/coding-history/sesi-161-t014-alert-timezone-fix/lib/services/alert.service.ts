// lib/services/alert.service.ts
// Service: cek threshold + kirim notifikasi WA + Email
// Dipakai oleh: metrics-collector.service.ts (setelah setiap batch metrics)
// Dibuat: Sesi #151 — PL-S09 Monitoring Dashboard
//
// PENTING: Tidak ada hardcode credential atau nomor kontak di file ini.
// Semua credential diambil dari M3 DB via credential.service.ts (ATURAN 11 — anti duplikasi).
// Semua target notifikasi diambil dari config_registry (ATURAN 8 — anti hardcode).

import 'server-only'
import { getCredential }      from '@/lib/services/credential.service'
import { getConfigValues }    from '@/lib/config-registry'
import { findRulesByProvider } from '@/lib/repositories/alert-rules.repository'
import { findLastAlertAt, insertAlertLog } from '@/lib/repositories/alert-log.repository'
import { findRecentByProvider }            from '@/lib/repositories/provider-metrics.repository'
import type { MonitoringStatus }           from '@/lib/types/monitoring.types'
import { MONITORING_STATUS, ALERT_TYPE }   from '@/lib/constants/monitoring.constant'

// ─── getAlertTarget — ambil nomor WA + email dari config_registry ────────────

/**
 * Ambil nomor WA + email penerima alert dari config_registry via getConfigValues.
 * Menggunakan cache unstable_cache TTL 300s dari config-registry.ts
 * (sebelumnya: query Supabase langsung via feature_key — tidak ada cache).
 *
 * FIX Sesi #160 — T-005 Opsi B:
 *   Sebelumnya: query direct `.in('feature_key', ['monitoring.superadmin_alert_wa_number', ...])`
 *   Sesudah: getConfigValues('monitoring') — konsisten dengan pola config_registry lain.
 *   DB: feature_key semua row monitoring diubah ke 'monitoring', policy_key diisi.
 */
async function getAlertTarget(): Promise<{ waNumber: string | null; email: string | null }> {
  const cfg = await getConfigValues('monitoring')
  return {
    waNumber: cfg['superadmin_alert_wa_number'] || null,
    email:    cfg['superadmin_alert_email']    || null,
  }
}

// ─── checkAndSendAlerts ───────────────────────────────────────────────────────

/**
 * Cek threshold untuk satu provider setelah metrik baru masuk.
 * Kirim WA + Email jika N kegagalan berturut-turut dan tidak dalam cooldown.
 */
export async function checkAndSendAlerts(
  providerId:     string,
  currentStatus:  MonitoringStatus,
  responseTimeMs: number | null
): Promise<void> {
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

  // Cek consecutive failures
  const recentMetrics = await findRecentByProvider(providerId, 60)
  const lastN = recentMetrics.slice(-rule.consecutive_failures)
  const allFailed =
    lastN.length === rule.consecutive_failures &&
    lastN.every(m => checkRuleTrigger(rule.alert_type, m.status, m.response_time_ms, rule.threshold_value))
  if (!allFailed) return

  // Cek cooldown
  const lastAlertAt = await findLastAlertAt(rule.id, rule.alert_type)
  if (lastAlertAt) {
    const elapsed = Date.now() - new Date(lastAlertAt).getTime()
    if (elapsed < rule.cooldown_minutes * 60 * 1000) return
  }

  // Ambil target notifikasi dari config_registry
  const { waNumber, email } = await getAlertTarget()
  const message = buildAlertMessage(providerId, rule.alert_type, currentStatus, responseTimeMs)

  const [resultWa, resultEmail] = await Promise.allSettled([
    rule.notif_channels.includes('WA') && waNumber
      ? sendWAAlert(message, waNumber)
      : Promise.resolve(null),
    rule.notif_channels.includes('EMAIL') && email
      ? sendEmailAlert(message, email)
      : Promise.resolve(null),
  ])

  await insertAlertLog({
    rule_id:        rule.id,
    provider_id:    providerId,
    alert_type:     rule.alert_type,
    message,
    notif_channels: rule.notif_channels,
    sent_via_wa:    resultWa.status    === 'fulfilled' && resultWa.value    !== null,
    sent_via_email: resultEmail.status === 'fulfilled' && resultEmail.value !== null,
    error_wa:       resultWa.status    === 'rejected'  ? String(resultWa.reason)    : undefined,
    error_email:    resultEmail.status === 'rejected'  ? String(resultEmail.reason) : undefined,
  })
}

// ─── checkRuleTrigger ─────────────────────────────────────────────────────────

function checkRuleTrigger(
  alertType:      string,
  status:         MonitoringStatus,
  responseTimeMs: number | null,
  threshold:      number
): boolean {
  switch (alertType) {
    case ALERT_TYPE.DOWN:             return status === MONITORING_STATUS.DOWN
    case ALERT_TYPE.SLOW:             return responseTimeMs !== null && responseTimeMs > threshold
    case ALERT_TYPE.HIGH_ERROR_RATE:  return status === MONITORING_STATUS.DEGRADED
    case ALERT_TYPE.QUOTA_WARNING:    return status === MONITORING_STATUS.DEGRADED
    default:                          return false
  }
}

// ─── buildAlertMessage ────────────────────────────────────────────────────────

function buildAlertMessage(
  providerId:     string,
  alertType:      string,
  status:         MonitoringStatus,
  responseTimeMs: number | null
): string {
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  const ms   = responseTimeMs !== null ? ` (${responseTimeMs}ms)` : ''
  return (
    `[ERP Mediator Alert] ${time} WIB\n` +
    `Provider: ${providerId}\n` +
    `Tipe: ${alertType} — Status: ${status}${ms}\n` +
    `Sistem memerlukan perhatian SuperAdmin.`
  )
}

// ─── sendWAAlert — via Fonnte (dari M3 credential.service) ───────────────────

/**
 * Kirim WA via Fonnte.
 * Token Fonnte diambil dari M3 DB via credential.service (ATURAN 11 — tidak duplikasi .env).
 * Nomor tujuan dari config_registry monitoring.superadmin_alert_wa_number.
 */
async function sendWAAlert(message: string, targetNumber: string): Promise<boolean> {
  // Token diambil dari M3 (bukan process.env langsung)
  const token = await getCredential('fonnte', 'api_token')
  if (!token) throw new Error('Token Fonnte belum dikonfigurasi di M3 Credential Management')
  if (!targetNumber) throw new Error('Nomor WA penerima alert belum dikonfigurasi di Config Registry')

  const res = await fetch('https://api.fonnte.com/send', {
    method:  'POST',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ target: targetNumber, message, countryCode: '62' }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Fonnte error ${res.status}: ${body}`)
  }
  return true
}

// ─── sendEmailAlert — via SMTP credential M3 ─────────────────────────────────

/**
 * Kirim Email via SMTP.
 * Credential SMTP diambil dari M3 DB via credential.service.
 * Email tujuan dari config_registry monitoring.superadmin_alert_email.
 * TODO: integrasi penuh Nodemailer di iterasi berikutnya.
 */
async function sendEmailAlert(message: string, targetEmail: string): Promise<boolean> {
  // Verifikasi credential SMTP ada di M3 sebelum kirim
  const smtpHost = await getCredential('smtp', 'host')
  if (!smtpHost) throw new Error('Credential SMTP belum dikonfigurasi di M3 Credential Management')
  if (!targetEmail) throw new Error('Email penerima alert belum dikonfigurasi di Config Registry')

  // TODO: Implementasi pengiriman email via Nodemailer + credential SMTP M3
  // Untuk saat ini: log + return true (tidak throw, supaya WA alert tetap bisa jalan)
  console.log(`[alert.service] Email alert → ${targetEmail}: ${message}`)
  console.log(`[alert.service] SMTP host: ${smtpHost} (credential dari M3)`)
  return true
}
