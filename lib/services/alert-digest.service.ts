// lib/services/alert-digest.service.ts
// Service: kirim ringkasan harian alert (Digest WA + Email) — A5 Fase 2
// Dibuat: Sesi #351 — A5 Daily Digest WA/Email
//
// Dipakai oleh: app/api/cron/send-digest/route.ts
//
// PENTING:
//   - Tidak ada hardcode teks pesan — semua dari message_library (LL#11)
//   - Tidak ada hardcode recipient atau jam kirim — semua dari config_registry (ATURAN 8)
//   - Tidak ada hardcode credential — sendFonnteWA + sendResendEmailPlain ambil sendiri
//   - Fungsi kirim WA: sendFonnteWA() dari lib/utils/fonnte.server.ts (ATURAN 19 — tidak duplikasi)
//   - Fungsi kirim Email: sendResendEmailPlain() dari lib/utils/resend.server.ts (ATURAN 19)

import 'server-only'
import { getMessage, interpolate }     from '@/lib/message-library'
import { sendFonnteWA }                from '@/lib/utils/fonnte.server'
import { sendResendEmailPlain }        from '@/lib/utils/resend.server'
import { getCredential }               from '@/lib/services/credential.service'
import { getAlertTarget }             from '@/lib/services/alert-helpers.service'
import {
  findYesterdayIncidents,
  type DigestIncident,
} from '@/lib/repositories/alert-digest.repository'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface DigestResult {
  success:        boolean
  sent_wa:        boolean
  sent_email:     boolean
  insiden_count:  number
  error?:         string
}

// ─── buildDigestWA — format ringkas untuk WhatsApp ───────────────────────────

/**
 * Bangun teks digest WA dari daftar insiden kemarin.
 * Format ringkas: daftar provider + alert_type + occurrence_count.
 * Teks diambil dari message_library — tidak hardcode.
 *
 * @param incidents  Daftar insiden kemarin dari repository
 * @param tanggal    String tanggal display (mis. "10 Juli 2026")
 * @returns string teks WA siap kirim
 */
export async function buildDigestWA(
  incidents: DigestIncident[],
  tanggal:   string
): Promise<string> {
  if (incidents.length === 0) {
    const tpl = await getMessage('alert.digest.wa.healthy')
    return interpolate(tpl, { tanggal })
  }

  // Bangun ringkasan per baris: "• NamaProvider — ALERT_TYPE (N kali)"
  const ringkasan = incidents
    .map(i => {
      const nama  = i.provider_nama ?? i.provider_id
      const count = i.occurrence_count > 1 ? ` (${i.occurrence_count}×)` : ''
      return `• ${nama} — ${i.alert_type}${count}`
    })
    .join('\n')

  const tpl = await getMessage('alert.digest.wa.summary')
  return interpolate(tpl, {
    tanggal,
    jumlah_insiden: String(incidents.length),
    ringkasan,
  })
}

// ─── buildDigestEmail — format detail untuk Email ────────────────────────────

/**
 * Bangun teks + subject email digest dari daftar insiden kemarin.
 * Format detail: tabel per provider dengan alert_type, jumlah, status.
 * Teks diambil dari message_library — tidak hardcode.
 *
 * @param incidents  Daftar insiden kemarin dari repository
 * @param tanggal    String tanggal display (mis. "10 Juli 2026")
 * @returns { subject: string; body: string }
 */
export async function buildDigestEmail(
  incidents: DigestIncident[],
  tanggal:   string
): Promise<{ subject: string; body: string }> {
  const subject = interpolate(await getMessage('alert.digest.email.subject'), { tanggal })

  if (incidents.length === 0) {
    const body = interpolate(await getMessage('alert.digest.email.healthy'), { tanggal })
    return { subject, body }
  }

  // Bangun tabel teks (plain text) per baris
  const header    = 'Provider                  | Tipe Alert | Jumlah | Status'
  const separator = '--------------------------|------------|--------|--------'
  const rows = incidents.map(i => {
    const nama   = (i.provider_nama ?? i.provider_id).padEnd(25).slice(0, 25)
    const type   = i.alert_type.padEnd(10).slice(0, 10)
    const count  = String(i.occurrence_count).padEnd(6).slice(0, 6)
    const status = i.status
    return `${nama} | ${type} | ${count} | ${status}`
  })
  const tabel_provider = [header, separator, ...rows].join('\n')

  const body = interpolate(await getMessage('alert.digest.email.summary'), {
    tanggal,
    jumlah_insiden: String(incidents.length),
    tabel_provider,
  })

  return { subject, body }
}

// ─── sendDailyDigest — orchestrator utama ────────────────────────────────────

/**
 * Orchestrator digest harian:
 *   1. Ambil insiden kemarin dari repository
 *   2. Ambil recipient dari config_registry (sama dengan alert biasa)
 *   3. Build konten WA + Email dari message_library
 *   4. Kirim WA via sendFonnteWA + Email via sendResendEmailPlain
 *
 * Dipanggil dari: /api/cron/send-digest/route.ts
 *
 * @returns DigestResult — status kirim WA + Email + jumlah insiden
 */
export async function sendDailyDigest(): Promise<DigestResult> {
  // 1. Ambil insiden kemarin
  const incidents = await findYesterdayIncidents()

  // 2. Ambil recipient via getAlertTarget() — shared function (ATURAN 19)
  const { waNumbers, emails } = await getAlertTarget()

  if (waNumbers.length === 0 && emails.length === 0) {
    return {
      success:       false,
      sent_wa:       false,
      sent_email:    false,
      insiden_count: incidents.length,
      error:         'Recipient belum dikonfigurasi (superadmin_alert_wa_number + superadmin_alert_email)',
    }
  }

  // 3. Tanggal kemarin WIB untuk display
  const kemarin = new Date()
  kemarin.setDate(kemarin.getDate() - 1)
  const tanggal = kemarin.toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
    timeZone: 'Asia/Jakarta',
  })

  // 4. Build konten
  const [waText, emailContent] = await Promise.all([
    buildDigestWA(incidents, tanggal),
    buildDigestEmail(incidents, tanggal),
  ])

  // 5. Kirim WA — loop per nomor (multi-recipient)
  let sent_wa    = false
  let sent_email = false
  const errors: string[] = []

  if (waNumbers.length > 0) {
    const fonnteToken = await getCredential('fonnte', 'api_token')
    if (!fonnteToken) {
      errors.push('Fonnte api_token belum dikonfigurasi di M3')
    } else {
      const waResults = await Promise.allSettled(
        waNumbers.map(num => sendFonnteWA(num, waText, fonnteToken))
      )
      sent_wa = waResults.some(r => r.status === 'fulfilled' && r.value.success)
      waResults.forEach((r, i) => {
        if (r.status === 'rejected') errors.push(`WA[${waNumbers[i]}]: ${r.reason}`)
        else if (!r.value.success) errors.push(`WA[${waNumbers[i]}]: ${r.value.reason ?? 'unknown'}`)
      })
    }
  }

  // 6. Kirim Email — loop per alamat (multi-recipient)
  if (emails.length > 0) {
    const emailResults = await Promise.allSettled(
      emails.map(addr => sendResendEmailPlain(addr, emailContent.subject, emailContent.body))
    )
    sent_email = emailResults.some(r => r.status === 'fulfilled' && r.value.success)
    emailResults.forEach((r, i) => {
      if (r.status === 'rejected') errors.push(`Email[${emails[i]}]: ${r.reason}`)
      else if (!r.value.success) errors.push(`Email[${emails[i]}]: ${r.value.reason ?? 'unknown'}`)
    })
  }

  return {
    success:       sent_wa || sent_email,
    sent_wa,
    sent_email,
    insiden_count: incidents.length,
    error:         errors.length > 0 ? errors.join(' | ') : undefined,
  }
}
