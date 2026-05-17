// lib/utils/smtp.server.ts
// Utility kirim email via SMTP menggunakan nodemailer.
// Server-only — jangan diimpor di Client Component.
//
// Dibuat: Sesi #167 — T-039 OTP channel routing (Opsi C)
// Dipakai oleh: lib/services/otp.service.ts (channel email)
//
// Credential dibaca via getCredential('smtp', ...) dari credential.service.ts.
// Fallback: SMTP_HOST / SMTP_PORT / SMTP_USERNAME / SMTP_PASSWORD / SMTP_FROM_NAME / SMTP_FROM_EMAIL
// sesuai ENV_FALLBACK di credential.service.ts.
//
// Field SMTP di DB (provider_field_definitions):
//   host, port, encryption (tls/ssl), username, password, from_name, from_email

import 'server-only'
import nodemailer              from 'nodemailer'
import { getCredential }       from '@/lib/services/credential.service'

// ─── Tipe parameter ───────────────────────────────────────────────────────────

export interface SendSmtpOTPParams {
  toEmail:      string
  toNama:       string
  subject:      string
  htmlBody:     string
  textBody:     string
}

export interface SendSmtpOTPResult {
  success:  boolean
  message?: string
}

// ─── FUNGSI: sendSmtpOTP ──────────────────────────────────────────────────────
/**
 * Kirim email via SMTP menggunakan nodemailer.
 * Credential diambil dari credential.service.ts (DB atau env fallback).
 *
 * @param params - toEmail, toNama, subject, htmlBody, textBody
 * @returns { success, message? }
 */
export async function sendSmtpOTP(params: SendSmtpOTPParams): Promise<SendSmtpOTPResult> {
  // ── Ambil semua credential SMTP secara paralel ────────────────────────────
  const [host, portStr, encryption, username, password, fromName, fromEmail] = await Promise.all([
    getCredential('smtp', 'host'),
    getCredential('smtp', 'port'),
    getCredential('smtp', 'encryption'),
    getCredential('smtp', 'username'),
    getCredential('smtp', 'password'),
    getCredential('smtp', 'from_name'),
    getCredential('smtp', 'from_email'),
  ])

  // ── Fail fast: wajib field ────────────────────────────────────────────────
  if (!host || !username || !password || !fromEmail) {
    console.error('[SmtpUtil] Credential SMTP tidak lengkap:', { host: !!host, username: !!username, password: !!password, fromEmail: !!fromEmail })
    return { success: false, message: 'Konfigurasi SMTP belum siap — hubungi SuperAdmin' }
  }

  const port      = parseInt(portStr ?? '587', 10)
  const useSecure = (encryption ?? 'tls') === 'ssl'  // ssl = port 465 (secure), tls = port 587 (STARTTLS)

  // ── Buat transporter ──────────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure:   useSecure,
    auth:     { user: username, pass: password },
    // STARTTLS otomatis untuk port 587 (non-secure) — nodemailer handle
    tls: useSecure ? undefined : { rejectUnauthorized: false },
  })

  // ── Kirim email ───────────────────────────────────────────────────────────
  try {
    await transporter.sendMail({
      from:    `"${fromName ?? 'Platform'}" <${fromEmail}>`,
      to:      `"${params.toNama}" <${params.toEmail}>`,
      subject: params.subject,
      text:    params.textBody,
      html:    params.htmlBody,
    })
    return { success: true }
  } catch (err) {
    console.error('[SmtpUtil] sendSmtpOTP gagal:', err)
    const msg = err instanceof Error ? err.message : 'Unknown SMTP error'
    return { success: false, message: `Gagal mengirim OTP via email: ${msg}` }
  }
}
