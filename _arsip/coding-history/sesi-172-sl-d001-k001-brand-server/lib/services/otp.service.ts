// lib/services/otp.service.ts
// Service layer untuk OTP — generate, simpan, kirim WA/Email, verifikasi.
// Panggil repository B-03 (otp) + CredentialService (Fonnte/SMTP token).
// Dibuat: Sesi #052 — BLOK C-04 TODO_ARSITEKTUR_LAYER_v1
//
// PERUBAHAN Sesi #068:
//   sendOTP() — 6 DB call sequential → Promise.all paralel (5 call sekaligus).
//   Call yang diparallelkan: getConfigValues + getCredential + getNamaPlatform
//   + getPlatformTimezone + getMessage (semua independen, tidak saling bergantung).
//   otpUpsert tetap sequential setelah Promise.all (butuh hasil cfg untuk expiredAt).
//
// PERUBAHAN Sesi #084 — E2 Redis OTP Phase 1:
//   sendOTP()          — Redis SET sebagai primary storage (TTL = otp_expiry_seconds).
//                        PostgreSQL upsert jadi async fire-and-forget (audit trail).
//                        Fallback: jika Redis down → PostgreSQL sync (path lama).
//   verifyAndConsume() — cek Redis GET dulu (fast path <1ms).
//                        Redis hit + match → Redis DEL + PostgreSQL consumed async → 'OK'.
//                        Redis hit + mismatch → 'WRONG' langsung (tanpa DB call).
//                        Redis miss → fallback PostgreSQL SP (path lama).
//   Estimasi dampak: verify-otp warm 580ms → ~130ms.
//
// FIX Sesi #157 — B1-01 + B1-02: key config salah → nilai selalu fallback, SA tidak bisa ubah:
//   B1-01: cfg['otp_expiry_minutes'] → cfg['otp_expiry_seconds'] (key DB = otp_expiry_seconds, nilai 300 detik).
//          Rename var otpExpiryMenit → otpExpiryDetik. Hapus x60 di kalkulasi expiredAt + Redis TTL.
//          Return otp_expiry_minutes: Math.round(otpExpiryDetik / 60) agar client tetap terima menit.
//   B1-02: cfg['otp_max_attempts'] → cfg['max_otp_attempts'] (key DB = max_otp_attempts).
//
// PERUBAHAN Sesi #085 — Fix TC-E04 type mismatch Redis:
//   verifyAndConsume() — Upstash get<string>() auto-JSON.parse numeric string menjadi number.
//                        "817193" tersimpan sebagai string, tapi get() return 817193 (number).
//                        Strict equality 817193 === "817193" selalu false → OTP selalu WRONG.
//                        Fix: String(storedCode) === params.inputCode (safe untuk string & number).
//
// PERUBAHAN Sesi #167 — T-039 OTP Channel Routing:
//   sendOTP() — Baca default_otp_channel dari config_registry.
//               'whatsapp' → kirim via Fonnte (path lama, tidak berubah).
//               'email'    → kirim via SMTP (lib/utils/smtp.server.ts, nodemailer).
//               'sms'      → return error informatif (belum ada provider SMS di platform).
//               Tambah field email? di SendOTPParams (wajib jika channel=email).
//               Promise.all diperluas: tambah getMessage('notif_email_otp_login').
//
// ARSITEKTUR:
//   Route Handler → OTPService → OTPRepository + CredentialService + MessageLibrary
//   OTPService juga panggil: config-registry untuk config OTP.
//   Redis (Upstash) via getRedisClient() sebagai primary OTP store.

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
import { sendSmtpOTP }                                             from '@/lib/utils/smtp.server'
import {
  findNamaBrandById,
  findDefaultNamaBrand,
} from '@/lib/repositories/tenant.repository'

// ─── Tipe untuk sendOTP ──────────────────────────────────────────────────────

export interface SendOTPParams {
  uid:      string
  tenantId: string
  role:     string
  nomorWa:  string
  email?:   string   // wajib diisi jika default_otp_channel = 'email'
  nama?:    string
}

export interface SendOTPResult {
  success:                  boolean
  message?:                 string
  otp_expiry_minutes?:      number
  otp_max_attempts?:        number
  resend_cooldown_seconds?: number
}

// ─── Tipe untuk verifyAndConsume ─────────────────────────────────────────────

export interface VerifyOTPParams {
  uid:       string
  tenantId:  string
  inputCode: string
}

// ─── PRIVATE: buat Redis key untuk OTP ───────────────────────────────────────
function makeOTPRedisKey(uid: string, tenantId: string): string {
  return `otp:${uid}:${tenantId || '_'}`
}

// ─── PRIVATE: generate kode OTP ──────────────────────────────────────────────
function generateOTPCode(panjang: number): string {
  const max = Math.pow(10, panjang)
  return Math.floor(Math.random() * max).toString().padStart(panjang, '0')
}

// ─── PRIVATE: ambil nama platform dari tenant via repository ─────────────────
async function getNamaPlatform(tenantId?: string): Promise<string> {
  try {
    if (tenantId) {
      const tenant = await findNamaBrandById(tenantId)
      if (tenant?.nama_brand) return tenant.nama_brand
    }
    const defaultTenant = await findDefaultNamaBrand()
    return defaultTenant?.nama_brand ?? ''
  } catch {
    return ''
  }
}

// ─── FUNGSI: sendOTP ──────────────────────────────────────────────────────────
/**
 * Generate OTP, simpan ke Redis (primary) dan PostgreSQL (async audit trail).
 * Kirim via channel yang dikonfigurasi SA: whatsapp (Fonnte) atau email (SMTP).
 *
 * OPTIMASI Sesi #068 — Promise.all untuk call independen (GRUP A).
 * PERUBAHAN Sesi #084 — Redis primary, PostgreSQL async audit (GRUP B).
 * PERUBAHAN Sesi #167 — channel routing: whatsapp / email / error-if-sms.
 *
 * @param params - uid, tenantId, role, nomorWa, email?, nama?
 * @returns SendOTPResult berisi success + config OTP untuk client
 */
export async function sendOTP(params: SendOTPParams): Promise<SendOTPResult> {

  // ── GRUP A: call paralel — config + credential WA + platform info ─────────
  const WA_FALLBACK =
    '*Kode OTP Anda: {otp_code}*\n\n' +
    'Untuk masuk sebagai *{role}* di {nama_platform}.\n\n' +
    'Berlaku hingga pukul *{expired_jam} WIB* tanggal {expired_tanggal}.\n\n' +
    '*JANGAN berikan kode ini kepada siapapun*.'

  const EMAIL_FALLBACK =
    'Kode OTP Anda: {otp_code}\n\n' +
    'Untuk masuk sebagai {role} di {nama_platform}.\n\n' +
    'Berlaku hingga pukul {expired_jam} WIB tanggal {expired_tanggal}.\n\n' +
    'JANGAN berikan kode ini kepada siapapun.'

  const [cfg, apiKey, namaPlatform, timezone, waTemplate, emailTemplate] = await Promise.all([
    getConfigValues('security_login'),
    getCredential('fonnte', 'api_token'),
    getNamaPlatform(params.tenantId),
    getPlatformTimezone(),
    getMessage('notif_wa_otp_login',    WA_FALLBACK),
    getMessage('notif_email_otp_login', EMAIL_FALLBACK),
  ])

  // ── Baca channel dari config (T-039) — default ke 'whatsapp' ──────────────
  const channel = (cfg['default_otp_channel'] ?? 'whatsapp').toLowerCase().trim()

  // ── Parse config + generate OTP ───────────────────────────────────────────
  const otpDigits         = parseConfigNumber(cfg['otp_digits'], 6)
  const otpExpiryDetik    = parseConfigNumber(cfg['otp_expiry_seconds'], 300)
  const otpMaxAttempts    = parseConfigNumber(cfg['max_otp_attempts'], 3)
  const otpResendCooldown = parseConfigNumber(cfg['otp_resend_cooldown_seconds'], 60)

  const kodeOTP   = generateOTPCode(otpDigits)
  const expiredAt = new Date(Date.now() + otpExpiryDetik * 1000)
  const redisKey  = makeOTPRedisKey(params.uid, params.tenantId)

  // ── GRUP B: simpan OTP — Redis primary, PostgreSQL async audit ────────────

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
    void otpUpsert({
      uid:       params.uid,
      tenantId:  params.tenantId,
      kode:      kodeOTP,
      expiredAt: expiredAt.toISOString(),
    }).catch(err => console.warn('[OTPService] PostgreSQL audit write gagal (non-critical):', err))
  } else {
    try {
      await otpUpsert({
        uid:       params.uid,
        tenantId:  params.tenantId,
        kode:      kodeOTP,
        expiredAt: expiredAt.toISOString(),
      })
    } catch (err) {
      console.error('[OTPService] Gagal simpan OTP:', err)
      return { success: false, message: 'Gagal menyiapkan OTP' }
    }
  }

  // ── Format waktu expired ───────────────────────────────────────────────────
  const expiredJam = expiredAt.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  })
  const expiredTanggal = expiredAt.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: timezone,
  })

  const interpolateVars = {
    otp_code:        kodeOTP,
    nama:            params.nama || params.role,
    role:            params.role,
    nama_platform:   namaPlatform,
    expired_jam:     expiredJam,
    expired_tanggal: expiredTanggal,
  }

  // ── Routing channel (T-039) ────────────────────────────────────────────────

  if (channel === 'whatsapp') {
    // ── Path WA: Fonnte API ───────────────────────────────────────────────────
    if (!apiKey) {
      console.error('[OTPService] Fonnte api_token tidak ditemukan')
      return { success: false, message: 'Konfigurasi WhatsApp belum siap' }
    }
    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method:  'POST',
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ target: params.nomorWa, message: interpolate(waTemplate, interpolateVars) }),
      })
      if (!response.ok) {
        const errBody = await response.text()
        console.error('[OTPService] Fonnte error:', response.status, errBody)
        return { success: false, message: 'Gagal mengirim OTP via WhatsApp' }
      }
    } catch (err) {
      console.error('[OTPService] sendOTP WA error:', err)
      return { success: false, message: 'Gagal mengirim OTP via WhatsApp' }
    }

  } else if (channel === 'email') {
    // ── Path Email: SMTP via smtp.server.ts ───────────────────────────────────
    if (!params.email) {
      console.error('[OTPService] Channel email dipilih tapi params.email kosong')
      return { success: false, message: 'Alamat email tidak tersedia untuk pengiriman OTP' }
    }
    const textBody  = interpolate(emailTemplate, interpolateVars)
    const htmlBody  = `<p>${textBody.replace(/\n/g, '<br>')}</p>`
    const smtpResult = await sendSmtpOTP({
      toEmail:  params.email,
      toNama:   params.nama || params.role,
      subject:  `Kode OTP Login - ${namaPlatform}`,
      textBody,
      htmlBody,
    })
    if (!smtpResult.success) return smtpResult

  } else {
    // ── Channel tidak dikenal atau SMS (belum ada provider) ───────────────────
    console.error('[OTPService] Channel OTP tidak didukung:', channel)
    return {
      success: false,
      message: `Channel OTP '${channel}' belum dikonfigurasi. Pilih 'whatsapp' atau 'email' di pengaturan SA.`,
    }
  }

  return {
    success:                  true,
    otp_expiry_minutes:       Math.round(otpExpiryDetik / 60),
    otp_max_attempts:         otpMaxAttempts,
    resend_cooldown_seconds:  otpResendCooldown,
  }
}

// ─── FUNGSI: verifyAndConsume ─────────────────────────────────────────────────
/**
 * Verifikasi kode OTP — Redis fast path, fallback ke SP PostgreSQL.
 *
 * PERUBAHAN Sesi #084 (E2 Redis OTP Phase 1):
 *   Redis hit + match   → DEL Redis + PostgreSQL consumed async → return 'OK'
 *   Redis hit + mismatch → return 'WRONG' langsung (tanpa DB call)
 *   Redis miss / Redis down → fallback SP PostgreSQL (path lama)
 *
 * FIX Sesi #085 (TC-E04):
 *   Upstash get<string>() auto-JSON.parse numeric string → number.
 *   Pakai String(storedCode) untuk normalisasi tipe sebelum comparison.
 *
 * @param params - uid, tenantId, inputCode
 * @returns OTPVerifyResult: 'OK' | 'EXPIRED' | 'WRONG' | 'NOT_FOUND' | 'ALREADY_USED'
 */
export async function verifyAndConsume(
  params: VerifyOTPParams
): Promise<OTPVerifyResult> {

  const redis    = await getRedisClient()
  const redisKey = makeOTPRedisKey(params.uid, params.tenantId)

  if (redis) {
    try {
      const storedCode = await redis.get<string>(redisKey)
      if (storedCode !== null) {
        if (String(storedCode) === params.inputCode) {
          await redis.del(redisKey)
          void spVerifyAndConsume({
            uid:       params.uid,
            tenantId:  params.tenantId,
            inputCode: params.inputCode,
          }).catch(err => console.warn('[OTPService] PostgreSQL consumed update gagal (non-critical):', err))
          return 'OK'
        }
        return 'WRONG'
      }
    } catch (err) {
      console.warn('[OTPService] Redis GET gagal, fallback ke PostgreSQL SP:', err)
    }
  }

  try {
    return await spVerifyAndConsume({
      uid:       params.uid,
      tenantId:  params.tenantId,
      inputCode: params.inputCode,
    })
  } catch (err) {
    console.error('[OTPService] verifyAndConsume gagal:', err)
    return 'NOT_FOUND'
  }
}

// ─── Re-export tipe ───────────────────────────────────────────────────────────
export type { OTPVerifyResult }
