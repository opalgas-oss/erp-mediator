// lib/utils/resend.server.ts
// Shared utility: kirim email via Resend API.
// Dibuat: Sesi #218 — ganti SMTP ke Resend REST API (aktivasi akun).
// Update: Sesi #294 — tambah sendResendEmailPlain() untuk alert monitoring (text-only).
//
// DESAIN:
//   Credential Resend (apiKey, fromEmail, fromName) diambil INTERNAL via getCredential('resend').
//   Caller tidak perlu inject credential — semua diambil dari M3 DB.
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'
import { getCredential } from '@/lib/services/credential.service'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface ResendEmailPayload {
  toEmail:  string
  toNama?:  string
  subject:  string
  htmlBody?: string
  textBody?: string
}

export interface ResendEmailResult {
  success:  boolean
  message?: string
}

// ─── sendResendEmail — utama (HTML + text, untuk aktivasi akun dll) ──────────

/**
 * Kirim email via Resend API — mendukung HTML + text body.
 * Credential Resend diambil dari M3 DB via getCredential().
 *
 * Dipanggil dari:
 *   - aktivasi-actions.ts (kirim ulang email aktivasi vendor)
 *
 * @param payload - Email tujuan + konten
 * @returns { success: boolean; message?: string }
 */
export async function sendResendEmail(
  payload: ResendEmailPayload
): Promise<ResendEmailResult> {
  const [apiKey, fromEmail, fromName] = await Promise.all([
    getCredential('resend', 'api_key'),
    getCredential('resend', 'from_email'),
    getCredential('resend', 'from_name'),
  ])

  if (!apiKey)    return { success: false, message: 'Resend api_key belum dikonfigurasi di M3' }
  if (!fromEmail) return { success: false, message: 'Resend from_email belum dikonfigurasi di M3' }

  try {
    const body: Record<string, unknown> = {
      from:    `${fromName ?? 'ERP Mediator'} <${fromEmail}>`,
      to:      [payload.toEmail],
      subject: payload.subject,
    }
    if (payload.htmlBody) body['html'] = payload.htmlBody
    if (payload.textBody) body['text'] = payload.textBody

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, message: `HTTP ${res.status}: ${errText}` }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, message }
  }
}

// ─── sendResendEmailPlain — untuk alert monitoring (text-only, simple) ───────

/**
 * Kirim email text-only via Resend — untuk alert monitoring.
 * Credential Resend diambil dari M3 DB via getCredential().
 * Throw Error jika credential tidak ada atau Resend gagal — ditangkap Promise.allSettled caller.
 *
 * Dipanggil dari:
 *   - alert.service.ts (sendEmailAlert)
 *
 * PERUBAHAN Sesi #294 — fungsi baru terpisah dari sendResendEmail agar interface
 * sendResendEmail tidak berubah (tidak merusak caller lama aktivasi-actions.ts).
 */
export async function sendResendEmailPlain(
  to:      string,
  subject: string,
  text:    string
): Promise<{ success: boolean; reason?: string }> {
  const [apiKey, fromEmail, fromName] = await Promise.all([
    getCredential('resend', 'api_key'),
    getCredential('resend', 'from_email'),
    getCredential('resend', 'from_name'),
  ])

  if (!apiKey)    throw new Error('Resend api_key belum dikonfigurasi di M3 Credential Management')
  if (!fromEmail) throw new Error('Resend from_email belum dikonfigurasi di M3 Credential Management')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `${fromName ?? 'ERP Mediator'} <${fromEmail}>`,
        to:      [to],
        subject,
        text,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return { success: false, reason: `HTTP ${res.status}: ${errText}` }
    }

    return { success: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, reason }
  }
}
