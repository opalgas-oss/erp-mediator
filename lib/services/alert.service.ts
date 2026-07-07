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
  // A2: Jika provider UP kembali, auto-resolve insiden terbuka
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

  const dedupKey = `${providerId}:${rule.alert_type}:TRIGGERED`

  // M3 Deduplication: cek insiden terbuka dengan dedup_key yang sama.
  // Jika ada (TRIGGERED/ACKNOWLEDGED) — increment occurrence_count, tidak insert baru.
  // Ini mencegah spam log saat provider down berkepanjangan + cooldown sudah terlewat.
  const existingOpen = await findOpenAlertByDedupKey(dedupKey)
  if (existingOpen) {
    await incrementAlertOccurrence(existingOpen.id)
    return
  }

  // Tidak ada insiden terbuka — alert pertama untuk kondisi ini.
  // Kirim notifikasi + insert baris baru ke alert_log.
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

  // insertAlertLog return string (ID aktual) — tersedia untuk A5/C6 Fase 2
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
  void newAlertId // ID aktual — dipakai Fase 2 A5 (digest) + C6 (timeline deep link)
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

// ─── buildIncidentUrl (A1 — deep link WA) ────────────────────────────────────

/**
 * Bangun URL deep link ke halaman detail insiden untuk notifikasi WA (A1).
 * Base URL diambil dari env NEXT_PUBLIC_APP_URL — tidak hardcode domain.
 * Tanpa alertLogId: link ke halaman list monitoring.
 * PERUBAHAN S#333 M3: alertLogPlaceholderId() dihapus.
 * ID aktual tersedia via insertAlertLog() return string — dipakai Fase 2 A5/C6.
 */
function buildIncidentUrl(alertLogId?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (alertLogId) {
    return `${base}/dashboard/superadmin/monitoring/incidents/${alertLogId}`
  }
  return `${base}/dashboard/superadmin/monitoring`
}

async function buildAlertMessage(
  providerId:     string,
  alertType:      string,
  status:         MonitoringStatus,
  responseTimeMs: number | null,
  incidentUrl:    string
): Promise<string> {
  const timezone = await getPlatformTimezone()
  const time = new Date().toLocaleString('id-ID', { timeZone: timezone })
  const ms   = responseTimeMs !== null ? ` (${responseTimeMs}ms)` : ''
  // A1: sertakan deep link ke halaman monitoring
  return (
    `[ERP Mediator Alert] ${time} WIB\n` +
    `Provider: ${providerId}\n` +
    `Tipe: ${alertType} — Status: ${status}${ms}\n` +
    `Sistem memerlukan perhatian SuperAdmin.\n` +
    `Detail: ${incidentUrl}`
  )
}

// ─── sendWAAlert — via Fonnte (dari M3 credential.service) ───────────────────

/**
 * Kirim WA via Fonnte — shared utility sendFonnteWA (lib/utils/fonnte.server.ts).
 * Token Fonnte diambil dari M3 DB via credential.service (ATURAN 11 — tidak duplikasi .env).
 * Nomor tujuan dari config_registry monitoring.superadmin_alert_wa_number.
 * Throw Error jika token tidak ada atau sendFonnteWA gagal — ditangkap Promise.allSettled caller.
 */
async function sendWAAlert(message: string, targetNumber: string): Promise<boolean> {
  // Token diambil dari M3 (bukan process.env langsung)
  const token = await getCredential('fonnte', 'api_token')
  if (!token) throw new Error('Token Fonnte belum dikonfigurasi di M3 Credential Management')
  if (!targetNumber) throw new Error('Nomor WA penerima alert belum dikonfigurasi di Config Registry')

  const result = await sendFonnteWA(targetNumber, message, token)
  if (!result.success) {
    throw new Error(`Fonnte error: ${result.reason ?? 'Unknown error'}`)
  }
  return true
}

// ─── sendEmailAlert — via Resend (dari M3 credential.service) ───────────────

/**
 * Kirim Email via Resend API.
 * Credential Resend (api_key, from_email, from_name) diambil dari M3 DB via credential.service.
 * Email tujuan dari config_registry monitoring.superadmin_alert_email.
 * Throw Error jika credential tidak ada atau Resend gagal — ditangkap Promise.allSettled caller.
 *
 * PERUBAHAN Sesi #294 — ganti stub SMTP → Resend nyata.
 * Provider aktif platform adalah Resend (use_case: notification, is_default: true).
 */
async function sendEmailAlert(message: string, targetEmail: string): Promise<boolean> {
  if (!targetEmail) throw new Error('Email penerima alert belum dikonfigurasi di Config Registry')

  const result = await sendResendEmailPlain(
    targetEmail,
    '[ERP Mediator] Alert Sistem Monitoring',
    message,
  )

  if (!result.success) {
    throw new Error(`Resend error: ${result.reason ?? 'Unknown error'}`)
  }
  return true
}
