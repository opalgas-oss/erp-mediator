// app/api/auth/send-otp/route.ts
// POST — Generate OTP, simpan ke otp_codes, kirim via Fonnte WhatsApp
// Semua nilai dibaca dari 3 Modul Dashboard SuperAdmin:
//   - Modul Konfigurasi : config_registry (otp_digits, otp_expiry_minutes, dll)
//   - Modul Pesan       : message_library (template notif_wa_otp_login)
//   - Modul API         : instance_credentials via credential-reader (Fonnte token)

import { NextRequest, NextResponse }          from 'next/server'
import { z }                                  from 'zod'
import { verifyJWT }                          from '@/lib/auth-server'
import { createServerSupabaseClient }         from '@/lib/supabase-server'
import { getCredential }                      from '@/lib/credential-reader'
import { getMessage, interpolate }            from '@/lib/message-library'
import { getConfigValues, parseConfigNumber } from '@/lib/config-registry'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:       z.string().min(1, 'uid wajib diisi'),
  tenant_id: z.string(),
  role:      z.string().min(1, 'role wajib diisi'),
  nomor_wa:  z.string().min(1, 'nomor_wa wajib diisi'),
  nama:      z.string().default(''),
})

// ─── Helper: Generate kode OTP dengan panjang dari config_registry ────────────

function buatKodeOTP(panjang: number): string {
  const max = Math.pow(10, panjang)
  return Math.floor(Math.random() * max).toString().padStart(panjang, '0')
}

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Verifikasi JWT ────────────────────────────────────────────────────────
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // ── Validasi input ────────────────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { uid, tenant_id, role, nomor_wa, nama } = parsed.data

    // ── Baca config OTP dari Modul Konfigurasi (config_registry) ─────────────
    const cfg = await getConfigValues('security_login')

    const otpDigits         = parseConfigNumber(cfg['otp_digits'],                  6)
    const otpExpiryMenit    = parseConfigNumber(cfg['otp_expiry_minutes'],          5)
    const otpMaxAttempts    = parseConfigNumber(cfg['otp_max_attempts'],            3)
    const otpResendCooldown = parseConfigNumber(cfg['otp_resend_cooldown_seconds'], 60)

    // ── Generate OTP ──────────────────────────────────────────────────────────
    const kodeOTP   = buatKodeOTP(otpDigits)
    const expiredAt = new Date(Date.now() + otpExpiryMenit * 60 * 1000)

    // ── Simpan OTP ke tabel otp_codes ─────────────────────────────────────────
    const db = createServerSupabaseClient()
    const { error: saveError } = await db
      .from('otp_codes')
      .upsert(
        {
          uid,
          tenant_id:  tenant_id || '',
          kode:       kodeOTP,
          expired_at: expiredAt.toISOString(),
          dipakai:    false,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,uid' }
      )

    if (saveError) {
      console.error('[send-otp] Gagal simpan OTP:', saveError)
      return NextResponse.json({ success: false, message: 'Gagal menyiapkan OTP' }, { status: 500 })
    }

    // ── Baca Fonnte token dari Modul API (credential-reader) ──────────────────
    const apiKey = await getCredential('fonnte', 'api_token')
    if (!apiKey) {
      console.error('[send-otp] Fonnte api_token tidak ditemukan')
      return NextResponse.json({ success: false, message: 'Konfigurasi WhatsApp belum siap' }, { status: 500 })
    }

    // ── Format waktu expired ──────────────────────────────────────────────────
    const expiredJam = expiredAt.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false,
    })
    const expiredTanggal = expiredAt.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    })

    // ── Baca template dari Modul Pesan (message_library) ─────────────────────
    const FALLBACK =
      '*Kode OTP Anda: {otp_code}*\n\n' +
      'Untuk masuk sebagai *{role}* di {nama_platform}.\n\n' +
      '⏰ Berlaku hingga pukul *{expired_jam} WIB* tanggal {expired_tanggal}.\n\n' +
      '🚫 *JANGAN berikan kode ini kepada siapapun*.'

    const template = await getMessage('notif_wa_otp_login', FALLBACK)
    const pesan    = interpolate(template, {
      otp_code: kodeOTP, nama: nama || role, role,
      nama_platform: 'ERP Mediator', expired_jam: expiredJam, expired_tanggal: expiredTanggal,
    })

    // ── Kirim via Fonnte ──────────────────────────────────────────────────────
    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ target: nomor_wa, message: pesan }),
    })

    if (!fonnteRes.ok) {
      const errBody = await fonnteRes.text()
      console.error('[send-otp] Fonnte error:', fonnteRes.status, errBody)
      return NextResponse.json({ success: false, message: 'Gagal mengirim OTP via WhatsApp' }, { status: 500 })
    }

    return NextResponse.json({
      success:                 true,
      otp_expiry_minutes:      otpExpiryMenit,
      otp_max_attempts:        otpMaxAttempts,
      resend_cooldown_seconds: otpResendCooldown,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    console.error('[send-otp] Error:', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
