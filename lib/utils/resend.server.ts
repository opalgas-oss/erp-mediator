// lib/utils/resend.server.ts
// Shared utility: kirim email via Resend API.
// Dibuat: Sesi #294 — Langkah 3: email alert nyata untuk monitoring dashboard.
//
// DESAIN:
//   Credential Resend (api_key, from_email, from_name) WAJIB diambil caller
//   via getCredential('resend', ...) sebelum memanggil fungsi ini.
//   Tidak di-fetch internal agar kompatibel dengan pola Promise.allSettled caller.
//
// ATURAN: import 'server-only' — tidak boleh dipakai di client component.

import 'server-only'

export interface ResendEmailPayload {
  apiKey:    string
  fromEmail: string
  fromName:  string
  to:        string
  subject:   string
  text:      string
}

/**
 * Kirim email via Resend API.
 *
 * Shared primitive — dipanggil dari:
 *   - AlertService (sendEmailAlert)
 *
 * @param payload - Credential + konten email
 * @returns { success: boolean; reason?: string }
 *   success=true  → email berhasil dikirim (HTTP 2xx dari Resend)
 *   success=false → gagal, reason berisi detail error
 */
export async function sendResendEmail(
  payload: ResendEmailPayload
): Promise<{ success: boolean; reason?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${payload.apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `${payload.fromName} <${payload.fromEmail}>`,
        to:      [payload.to],
        subject: payload.subject,
        text:    payload.text,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { success: false, reason: `HTTP ${res.status}: ${errBody}` }
    }

    return { success: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, reason }
  }
}
