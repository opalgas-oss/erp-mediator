// ARSIP SESI #205 — PRE-FIX BUG-017/018/019
// File asli: lib/services/otp.service.ts
// Disalin sebelum modifikasi: sendOTP() + verifyAndConsume()
// lib/services/otp.service.ts
// Service layer untuk OTP — generate, simpan, kirim WA/Email, verifikasi.
// Panggil repository B-03 (otp) + CredentialService (Fonnte/SMTP token).
// Dibuat: Sesi #052 — BLOK C-04 TODO_ARSITEKTUR_LAYER_v1

import 'server-only'
import {
  upsert as otpUpsert,
  spVerifyAndConsume,
  type OTPVerifyResult,
} from '@/lib/repositories/otp.repository'
import { getRedisClient }                                          from '@/lib/redis'
import { getCredential }                                           from '@/lib/services/credential.service'
import { getMessage, interpolate }                                 from '@/lib/message-library'
import { getConfigValues, parseConfigNumber, getPlatformTimezone } from '@/lib/config-registry'
import { sendSmtpOTP }             from '@/lib/utils/smtp.server'
import { getNamaBrandPlatform }    from '@/lib/utils/brand.server'
import { sendFonnteWA }            from '@/lib/utils/fonnte.server'

export interface SendOTPParams {
  uid:      string
  tenantId: string
  role:     string
  nomorWa:  string
  email?:   string
  nama?:    string
}

export interface SendOTPResult {
  success:                  boolean
  message?:                 string
  otp_expiry_minutes?:      number
  otp_max_attempts?:        number
  resend_cooldown_seconds?: number
}

export interface VerifyOTPParams {
  uid:       string
  tenantId:  string
  inputCode: string
}

function makeOTPRedisKey(uid: string, tenantId: string): string {
  return `otp:${uid}:${tenantId || '_'}`
}

function generateOTPCode(panjang: number): string {
  const max = Math.pow(10, panjang)
  return Math.floor(Math.random() * max).toString().padStart(panjang, '0')
}

export async function sendOTP(params: SendOTPParams): Promise<SendOTPResult> {
  const WA_FALLBACK = '*Kode OTP Anda: {otp_code}*\n\nUntuk masuk sebagai *{role}* di {nama_platform}.\n\nBerlaku hingga pukul *{expired_jam} WIB* tanggal {expired_tanggal}.\n\n*JANGAN berikan kode ini kepada siapapun*.'
  const EMAIL_FALLBACK = 'Kode OTP Anda: {otp_code}\n\nUntuk masuk sebagai {role} di {nama_platform}.\n\nBerlaku hingga pukul {expired_jam} WIB tanggal {expired_tanggal}.\n\nJANGAN berikan kode ini kepada siapapun.'

  const [cfg, apiKey, namaPlatform, timezone, waTemplate, emailTemplate] = await Promise.all([
    getConfigValues('security_login'),
    getCredential('fonnte', 'api_token'),
    getNamaBrandPlatform(params.tenantId),
    getPlatformTimezone(),
    getMessage('notif_wa_otp_login', WA_FALLBACK),
    getMessage('notif_email_otp_login', EMAIL_FALLBACK),
  ])

  const channel = (cfg['default_otp_channel'] ?? 'whatsapp').toLowerCase().trim()
  const otpDigits         = parseConfigNumber(cfg['otp_digits'], 6)
  const otpExpiryDetik    = parseConfigNumber(cfg['otp_expiry_seconds'], 300)
  const otpMaxAttempts    = parseConfigNumber(cfg['max_otp_attempts'], 3)
  const otpResendCooldown = parseConfigNumber(cfg['otp_resend_cooldown_seconds'], 60)

  const kodeOTP   = generateOTPCode(otpDigits)
  const expiredAt = new Date(Date.now() + otpExpiryDetik * 1000)
  const redisKey  = makeOTPRedisKey(params.uid, params.tenantId)

  const redis   = await getRedisClient()
  let   redisOk = false

  if (redis) {
    try {
      await redis.set(redisKey, kodeOTP, { ex: otpExpiryDetik })
      redisOk = true
    } catch (err) {
      console.warn('[OTPService] Redis SET gagal, fallback ke PostgreSQL sync:', err)
    }
  }

  if (redisOk) {
    void otpUpsert({ uid: params.uid, tenantId: params.tenantId, kode: kodeOTP, expiredAt: expiredAt.toISOString() }).catch(err => console.warn('[OTPService] PostgreSQL audit write gagal (non-critical):', err))
  } else {
    try {
      await otpUpsert({ uid: params.uid, tenantId: params.tenantId, kode: kodeOTP, expiredAt: expiredAt.toISOString() })
    } catch (err) {
      console.error('[OTPService] Gagal simpan OTP:', err)
      return { success: false, message: 'Gagal menyiapkan OTP' }
    }
  }

  const expiredJam = expiredAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false })
  const expiredTanggal = expiredAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: timezone })
  const interpolateVars = { otp_code: kodeOTP, nama: params.nama || params.role, role: params.role, nama_platform: namaPlatform, expired_jam: expiredJam, expired_tanggal: expiredTanggal }

  if (channel === 'whatsapp') {
    if (!apiKey) { console.error('[OTPService] Fonnte api_token tidak ditemukan'); return { success: false, message: 'Konfigurasi WhatsApp belum siap' } }
    try {
      const waResult = await sendFonnteWA(params.nomorWa, interpolate(waTemplate, interpolateVars), apiKey)
      if (!waResult.success) { console.error('[OTPService] Fonnte error:', waResult.reason); return { success: false, message: 'Gagal mengirim OTP via WhatsApp' } }
    } catch (err) { console.error('[OTPService] sendOTP WA error:', err); return { success: false, message: 'Gagal mengirim OTP via WhatsApp' } }
  } else if (channel === 'email') {
    if (!params.email) { console.error('[OTPService] Channel email dipilih tapi params.email kosong'); return { success: false, message: 'Alamat email tidak tersedia untuk pengiriman OTP' } }
    const textBody = interpolate(emailTemplate, interpolateVars)
    const smtpResult = await sendSmtpOTP({ toEmail: params.email, toNama: params.nama || params.role, subject: `Kode OTP Login - ${namaPlatform}`, textBody, htmlBody: `<p>${textBody.replace(/\n/g, '<br>')}</p>` })
    if (!smtpResult.success) return smtpResult
  } else {
    return { success: false, message: `Channel OTP '${channel}' belum dikonfigurasi. Pilih 'whatsapp' atau 'email' di pengaturan SA.` }
  }

  return { success: true, otp_expiry_minutes: Math.round(otpExpiryDetik / 60), otp_max_attempts: otpMaxAttempts, resend_cooldown_seconds: otpResendCooldown }
}

export async function verifyAndConsume(params: VerifyOTPParams): Promise<OTPVerifyResult> {
  const redis    = await getRedisClient()
  const redisKey = makeOTPRedisKey(params.uid, params.tenantId)

  if (redis) {
    try {
      const storedCode = await redis.get<string>(redisKey)
      if (storedCode !== null) {
        if (String(storedCode) === params.inputCode) {
          await redis.del(redisKey)
          void spVerifyAndConsume({ uid: params.uid, tenantId: params.tenantId, inputCode: params.inputCode }).catch(err => console.warn('[OTPService] PostgreSQL consumed update gagal (non-critical):', err))
          return 'OK'
        }
        return 'WRONG'
      }
    } catch (err) {
      console.warn('[OTPService] Redis GET gagal, fallback ke PostgreSQL SP:', err)
    }
  }

  try {
    return await spVerifyAndConsume({ uid: params.uid, tenantId: params.tenantId, inputCode: params.inputCode })
  } catch (err) {
    console.error('[OTPService] verifyAndConsume gagal:', err)
    return 'NOT_FOUND'
  }
}

export type { OTPVerifyResult }
