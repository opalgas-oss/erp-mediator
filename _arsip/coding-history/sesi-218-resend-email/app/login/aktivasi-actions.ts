// ARSIP PRE-EDIT S#218 — app/login/aktivasi-actions.ts
// Server Action: kirim ulang email aktivasi akun (approved + lifecycle=pending)
// Dibuat: Sesi #215 — Fitur Kirim Ulang Email Aktivasi
//
// Flow:
//   1. Verifikasi user ada dengan kondisi approved + lifecycle=pending
//   2. Generate UUID token (plain) + hash SHA-256 (disimpan di DB)
//   3. INSERT ke activation_email_logs
//   4. Kirim email via smtp.server.ts (SMTP harus dikonfigurasi di dashboard SA)
//   5. Return { ok: true } atau { ok: false, errorKey }
//
// Endpoint aktivasi: GET /api/activate?token=<plain_token>
// Token expiry: 7 hari

'use server'

import { createHash }                 from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendSmtpOTP }                from '@/lib/utils/smtp.server'

export interface KirimUlangAktivasiParams {
  userEmail: string
}

export interface KirimUlangAktivasiResult {
  ok:        boolean
  errorKey?: string
}

const TOKEN_EXPIRY_HARI = 7
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.VERCEL_URL ??
  'https://erp-mediator-git-dev-philips-liemenas-projects.vercel.app'

export async function kirimUlangEmailAktivasiAction(
  params: KirimUlangAktivasiParams
): Promise<KirimUlangAktivasiResult> {
  const { userEmail } = params

  if (!userEmail || !userEmail.includes('@')) {
    return { ok: false, errorKey: 'login_error_umum' }
  }

  const adminDb = createServerSupabaseClient()

  const { data: userRow } = await adminDb
    .from('user_profiles')
    .select('id, nama, register_status, lifecycle_status')
    .eq('email', userEmail)
    .eq('register_status', 'approved')
    .eq('lifecycle_status', 'pending')
    .maybeSingle()

  if (!userRow) {
    return { ok: false, errorKey: 'login_error_umum' }
  }

  const plainToken = crypto.randomUUID()
  const tokenHash  = createHash('sha256').update(plainToken).digest('hex')
  const expiry     = new Date(Date.now() + TOKEN_EXPIRY_HARI * 24 * 60 * 60 * 1000)

  const { error: logError } = await adminDb
    .from('activation_email_logs')
    .insert({
      entity_type:      'vendor',
      entity_id:        userRow.id,
      email_to:         userEmail,
      email_type:       'activation',
      sent_at:          new Date().toISOString(),
      token_hash:       tokenHash,
      token_expires_at: expiry.toISOString(),
      status:           'pending',
    })

  if (logError) {
    console.error('[kirimUlangAktivasi] INSERT activation_email_logs gagal:', logError.message)
    return { ok: false, errorKey: 'login_aktivasi_gagal_kirim' }
  }

  const activationUrl = `${APP_URL}/api/activate?token=${plainToken}`
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e3a5f;margin-bottom:8px;">Aktivasi Akun ERP Mediator Hyperlocal</h2>
      <p style="color:#444;margin-bottom:20px;">
        Halo <strong>${userRow.nama ?? 'Pengguna'}</strong>,<br/>
        Klik tombol di bawah untuk mengaktifkan akun Anda:
      </p>
      <a href="${activationUrl}"
         style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;
                text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
        Aktifkan Akun
      </a>
      <p style="color:#888;font-size:13px;margin-top:24px;">
        Link ini berlaku selama ${TOKEN_EXPIRY_HARI} hari.<br/>
        Jika Anda tidak merasa mendaftar, abaikan email ini.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#aaa;font-size:12px;">ERP Mediator Hyperlocal</p>
    </div>
  `
  const textBody =
    `Aktifkan akun Anda di ERP Mediator Hyperlocal:\n\n${activationUrl}\n\nLink berlaku ${TOKEN_EXPIRY_HARI} hari.`

  const smtpResult = await sendSmtpOTP({
    toEmail:  userEmail,
    toNama:   userRow.nama ?? 'Pengguna',
    subject:  'Aktivasi Akun ERP Mediator Hyperlocal',
    htmlBody,
    textBody,
  })

  if (!smtpResult.success) {
    console.error('[kirimUlangAktivasi] SMTP gagal:', smtpResult.message)
    await adminDb
      .from('activation_email_logs')
      .update({ status: 'failed', error_message: smtpResult.message ?? 'SMTP error' })
      .eq('token_hash', tokenHash)
    return { ok: false, errorKey: 'login_aktivasi_gagal_kirim' }
  }

  return { ok: true }
}
