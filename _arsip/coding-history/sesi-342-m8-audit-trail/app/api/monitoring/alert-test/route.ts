// app/api/monitoring/alert-test/route.ts
// POST — Kirim alert uji coba ke WA + Email SuperAdmin (B1)
// Dipakai oleh: tombol "Kirim Alert Uji Coba" di halaman monitoring
// Dibuat: Sesi #331 — FASE 1 Alert Monitoring
// ============================================================
// ARSIP SESI #342 — sebelum integrasi M8 Audit Trail
// ============================================================

import { NextResponse }         from 'next/server'
import { requireSuperAdminCookie } from '@/lib/auth-server'
import { getConfigValues }         from '@/lib/config-registry'
import { getCredential }           from '@/lib/services/credential.service'
import { sendFonnteWA }            from '@/lib/utils/fonnte.server'
import { sendResendEmailPlain }    from '@/lib/utils/resend.server'
import { getMessage }           from '@/lib/message-library'

export async function POST() {
  const auth = await requireSuperAdminCookie()
  if (!auth.ok) return auth.res

  const cfg       = await getConfigValues('monitoring')
  const waNumber  = cfg['superadmin_alert_wa_number'] || null
  const email     = cfg['superadmin_alert_email']     || null

  if (!waNumber && !email) {
    return NextResponse.json(
      { success: false, message: 'Nomor WA dan Email penerima alert belum dikonfigurasi di Config Registry (monitoring.superadmin_alert_wa_number / monitoring.superadmin_alert_email).' },
      { status: 400 }
    )
  }

  const waText      = await getMessage('alert.wa.test',         'Ini adalah pesan uji coba notifikasi dari ERP Mediator. Sistem notifikasi berfungsi normal.')
  const emailSubject = await getMessage('alert.email.test_subject', '[ERP Mediator] Uji Coba Notifikasi Alert')

  const results: { wa?: string; email?: string } = {}
  const errors:  { wa?: string; email?: string } = {}

  if (waNumber) {
    try {
      const token = await getCredential('fonnte', 'api_token')
      if (!token) throw new Error('Token Fonnte belum dikonfigurasi di M3')
      const res = await sendFonnteWA(waNumber, waText, token)
      if (!res.success) throw new Error(res.reason ?? 'Fonnte gagal')
      results.wa = 'Terkirim'
    } catch (err) {
      errors.wa = err instanceof Error ? err.message : String(err)
    }
  }

  if (email) {
    try {
      const res = await sendResendEmailPlain(email, emailSubject, waText)
      if (!res.success) throw new Error(res.reason ?? 'Resend gagal')
      results.email = 'Terkirim'
    } catch (err) {
      errors.email = err instanceof Error ? err.message : String(err)
    }
  }

  const hasSuccess = Object.keys(results).length > 0
  const hasErrors  = Object.keys(errors).length > 0

  return NextResponse.json({
    success: hasSuccess,
    results,
    errors: hasErrors ? errors : undefined,
    message: hasSuccess
      ? `Alert uji coba berhasil dikirim via: ${Object.keys(results).join(', ')}.${hasErrors ? ` Gagal: ${Object.entries(errors).map(([k,v]) => `${k} (${v})`).join(', ')}` : ''}`
      : 'Semua channel gagal. Periksa konfigurasi credential Fonnte dan Resend.',
  }, { status: hasSuccess ? 200 : 500 })
}
