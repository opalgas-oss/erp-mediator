// lib/services/otp.service.ts
// Service layer untuk OTP — generate, simpan, kirim WA, verifikasi.
// Panggil repository B-03 (otp) + CredentialService (Fonnte token).
// Dibuat: Sesi #052 — BLOK C-04 TODO_ARSITEKTUR_LAYER_v1
//
// PERUBAHAN Sesi #068:
//   sendOTP() — 6 DB call sequential → Promise.all paralel (5 call sekaligus).
//   Call yang diparallelkan: getConfigValues + getCredential + getNamaPlatform
//   + getPlatformTimezone + getMessage (semua independen, tidak saling bergantung).
//   otpUpsert tetap sequential setelah Promise.all (butuh hasil cfg untuk expiredAt).
//
// PERUBAHAN Sesi #084 — E2 Redis OTP Phase 1:
//   sendOTP()          — Redis SET sebagai primary storage (TTL = otp_expiry_minutes × 60s).
//                        PostgreSQL upsert jadi async fire-and-forget (audit trail).
//                        Fallback: jika Redis down → PostgreSQL sync (path lama).
//   verifyAndConsume() — cek Redis GET dulu (fast path <1ms).
//                        Redis hit + match → Redis DEL + PostgreSQL consumed async → 'OK'.
//                        Redis hit + mismatch → 'WRONG' langsung (tanpa DB call).
//                        Redis miss → fallback PostgreSQL SP (path lama).
//   Estimasi dampak: verify-otp warm 580ms → ~130ms.
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
  nama?:    string
}

export interface SendOTPResult {
  success:                  boolean
  message?:                 string
  otp_expiry_minutes?:      number
  otp_max_attempts?:        number
  resend_cooldown_seconds?: number
}

// ─── Tipe untuk verifyAndConsume ──────────────────────────────────────────────

export interface VerifyOTPParams {
  uid:       string
  tenantId:  string
  inputCode: string
}

// ─── PRIVATE: buat Redis key untuk OTP ───────────────────────────────────────
// Format: otp:{uid}:{tenantId} — include tenantId untuk isolasi multi-tenant.
// tenantId bisa string kosong (SA tidak punya tenant) → pakai '_' sebagai fallback.
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
 * Kirim via Fonnte WhatsApp. Semua config OTP dari config_registry.
 *
 * OPTIMASI Sesi #068 — Promise.all untuk 5 call independen (GRUP A).
 * PERUBAHAN Sesi #084 — Redis primary, PostgreSQL async audit (GRUP B).
 *   Fallback: jika Redis down → PostgreSQL sync (path lama, aman).
 *
 * @param params - uid, tenantId, role, nomorWa, nama
 * @returns SendOTPResult berisi success + config OTP untuk client
 */
export async function sendOTP(params: SendOTPParams): Promise<SendOTPResult> {

  // ── GRUP A: 5 call paralel — tidak saling bergantung ─────────────────────
  const FALLBACK =
    '*Kode OTP Anda: {otp_code}*\n\n' +
    'Untuk masuk sebagai *{role}* di {nama_platform}.\n\n' +
    '⏰ Berlaku hingga pukul *{expired_jam} WIB* tanggal {expired_tanggal}.\n\n' +
    '🚫 *JANGAN berikan kode ini kepada siapapun*.'

  const [cfg, apiKey, namaPlatform, timezone, template] = await Promise.all([
    getConfigValues('security_login'),
    getCredential('fonnte', 'api_token'),
    getNamaPlatform(params.tenantId),
    getPlatformTimezone(),
    getMessage('notif_wa_otp_login', FALLBACK),
  ])

  // ── Fail fast: cek apiKey sebelum lanjut ──────────────────────────────────
  if (!apiKey) {
    console.error('[OTPService] Fonnte api_token tidak ditemukan')
    return { success: false, message: 'Konfigurasi WhatsApp belum siap' }
  }

  // ── Parse config + generate OTP ───────────────────────────────────────────
  const otpDigits         = parseConfigNumber(cfg['otp_digits'], 6)
  const otpExpiryMenit    = parseConfigNumber(cfg['otp_expiry_minutes'], 5)
  const otpMaxAttempts    = parseConfigNumber(cfg['otp_max_attempts'], 3)
  const otpResendCooldown = parseConfigNumber(cfg['otp_resend_cooldown_seconds'], 60)

  const kodeOTP   = generateOTPCode(otpDigits)
  const expiredAt = new Date(Date.now() + otpExpiryMenit * 60 * 1000)
  const redisKey  = makeOTPRedisKey(params.uid, params.tenantId)

  // ── GRUP B: simpan OTP — Redis primary, PostgreSQL async audit ────────────

  const redis   = await getRedisClient()
  let   redisOk = false

  if (redis) {
    try {
      // Redis SET dengan TTL = durasi OTP dalam detik
      await redis.set(redisKey, kodeOTP, { ex: otpExpiryMenit * 60 })
      redisOk = true
    } catch (err) {
      console.warn('[OTPService] Redis SET gagal, fallback ke PostgreSQL sync:', err)
    }
  }

  if (redisOk) {
    // Redis OK → PostgreSQL jadi async audit trail (fire-and-forget, non-critical)
    void otpUpsert({
      uid:       params.uid,
      tenantId:  params.tenantId,
      kode:      kodeOTP,
      expiredAt: expiredAt.toISOString(),
    }).catch(err => console.warn('[OTPService] PostgreSQL audit write gagal (non-critical):', err))
  } else {
    // Redis down → PostgreSQL sync (satu-satunya penyimpanan — path lama)
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

  // ── Format waktu expired + bangun pesan ───────────────────────────────────
  const expiredJam = expiredAt.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  })
  const expiredTanggal = expiredAt.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: timezone,
  })

  const pesan = interpolate(template, {
    otp_code:        kodeOTP,
    nama:            params.nama || params.role,
    role:            params.role,
    nama_platform:   namaPlatform,
    expired_jam:     expiredJam,
    expired_tanggal: expiredTanggal,
  })

  // ── Kirim via Fonnte API ───────────────────────────────────────────────────
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ target: params.nomorWa, message: pesan }),
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

  return {
    success:                  true,
    otp_expiry_minutes:       otpExpiryMenit,
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
 * @param params - uid, tenantId, inputCode
 * @returns OTPVerifyResult: 'OK' | 'EXPIRED' | 'WRONG' | 'NOT_FOUND' | 'ALREADY_USED'
 */
export async function verifyAndConsume(
  params: VerifyOTPParams
): Promise<OTPVerifyResult> {

  const redis    = await getRedisClient()
  const redisKey = makeOTPRedisKey(params.uid, params.tenantId)

  // ── Fast path: cek Redis dulu ─────────────────────────────────────────────
  if (redis) {
    try {
      const storedCode = await redis.get<string>(redisKey)

      if (storedCode !== null) {
        // Redis hit — kode masih dalam TTL (belum expired)
        if (storedCode === params.inputCode) {
          // Match → hapus dari Redis (consumed) + async mark consumed di PostgreSQL
          await redis.del(redisKey)
          void spVerifyAndConsume({
            uid:       params.uid,
            tenantId:  params.tenantId,
            inputCode: params.inputCode,
          }).catch(err => console.warn('[OTPService] PostgreSQL consumed update gagal (non-critical):', err))
          return 'OK'
        }
        // Mismatch → WRONG langsung, Redis key tetap ada untuk retry dalam TTL
        return 'WRONG'
      }
      // Redis miss → TTL habis atau Redis restart → fallback ke PostgreSQL SP
    } catch (err) {
      console.warn('[OTPService] Redis GET gagal, fallback ke PostgreSQL SP:', err)
    }
  }

  // ── Fallback: PostgreSQL SP (path lama — atomic, race-condition safe) ──────
  // Menangani: EXPIRED, WRONG, NOT_FOUND, ALREADY_USED dengan SP.
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
