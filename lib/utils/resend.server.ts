// lib/utils/resend.server.ts
// Helper kirim email via Resend REST API — native fetch, tanpa library tambahan.
// Credentials (api_key, from_name, from_email) dibaca dari credential.service.ts.
// SA harus sudah tambah provider 'resend' + isi credentials dari dashboard Providers.
// Dibuat: Sesi #218 — STEP 2 koneksi email

import 'server-only'
import { getCredential } from '@/lib/services/credential.service'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface SendResendEmailParams {
  toEmail:  string
  toNama:   string
  subject:  string
  htmlBody: string
  textBody: string
}

export interface SendResendEmailResult {
  success:  boolean
  message?: string
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Kirim email via Resend REST API.
 *
 * Credential dibaca dari Supabase (SA isi via dashboard Providers):
 *   resend.api_key    — Bearer token Resend (secret)
 *   resend.from_name  — Nama pengirim (misal: "ERP Mediator")
 *   resend.from_email — Email pengirim (misal: noreply@domain.com)
 *
 * Resend API endpoint: POST https://api.resend.com/emails
 * Auth: Authorization: Bearer {api_key}
 * Body: { from, to: [email], subject, html, text }
 *
 * Tidak pakai library tambahan — native fetch Node.js (tersedia di Next.js 16+).
 */
export async function sendResendEmail(
  params: SendResendEmailParams
): Promise<SendResendEmailResult> {

  // Baca 3 credential secara paralel — efisien, tidak blocking
  const [apiKey, fromName, fromEmail] = await Promise.all([
    getCredential('resend', 'api_key'),
    getCredential('resend', 'from_name'),
    getCredential('resend', 'from_email'),
  ])

  // Validasi: api_key dan from_email wajib ada
  if (!apiKey) {
    console.error('[resend.server] api_key tidak ditemukan — setup Resend di dashboard SA Providers')
    return {
      success: false,
      message: 'Konfigurasi email belum siap (api_key). Hubungi administrator.',
    }
  }

  if (!fromEmail) {
    console.error('[resend.server] from_email tidak ditemukan — isi credential Resend di dashboard SA')
    return {
      success: false,
      message: 'Konfigurasi email belum siap (from_email). Hubungi administrator.',
    }
  }

  // Format: "Nama Pengirim <email@domain.com>" atau hanya email jika from_name kosong
  const fromField = fromName ? `${fromName} <${fromEmail}>` : fromEmail

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from:    fromField,
        to:      [params.toEmail],
        subject: params.subject,
        html:    params.htmlBody,
        text:    params.textBody,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      console.error(`[resend.server] Resend API error ${response.status}:`, errBody)
      return {
        success: false,
        message: `Resend error ${response.status}: ${errBody}`,
      }
    }

    return { success: true }

  } catch (err) {
    console.error('[resend.server] Network error saat hubungi Resend API:', err)
    return {
      success: false,
      message: 'Gagal menghubungi Resend API',
    }
  }
}
