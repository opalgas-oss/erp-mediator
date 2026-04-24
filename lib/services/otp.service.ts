// lib/services/otp.service.ts
// Service layer untuk OTP — generate, simpan, kirim WA, verifikasi.
// Panggil repository B-03 (otp) + CredentialService (Fonnte token).
// Dibuat: Sesi #052 — BLOK C-04 TODO_ARSITEKTUR_LAYER_v1
//
// ARSITEKTUR:
//   Route Handler → OTPService → OTPRepository + CredentialService + MessageLibrary
//   OTPService juga panggil: config-registry untuk config OTP.

import 'server-only'
import {
  upsert as otpUpsert,
  spVerifyAndConsume,
  type OTPVerifyResult,
} from '@/lib/repositories/otp.repository'
import { getCredential } from '@/lib/services/credential.service'
import { getMessage, interpolate } from '@/lib/message-library'
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
  success:                 boolean
  message?:                string
  otp_expiry_minutes?:     number
  otp_max_attempts?:       number
  resend_cooldown_seconds?: number
}

// ─── Tipe untuk verifyAndConsume ──────────────────────────────────────────────

export interface VerifyOTPParams {
  uid:       string
  tenantId:  string
  inputCode: string
}

// ─── PRIVATE: generate kode OTP ──────────────────────────────────────────────
function generateOTPCode(panjang: number): string {
  const max = Math.pow(10, panjang)
  return Math.floor(Math.random() * max).toString().padStart(panjang, '0')
}

// ─── PRIVATE: ambil nama platform dari tenant via repository ────────────────
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

// ─── FUNGSI: sendOTP ─────────────────────────────────────────────────────────
// Generate OTP, simpan ke DB via repository, kirim via Fonnte WA.
// Return config OTP (expiry, max_attempts, cooldown) untuk client.
/**
 * Generate OTP, simpan ke DB via repository, kirim via Fonnte WhatsApp.
 * Semua config OTP (digits, expiry, max_attempts, cooldown) dari config_registry.
 * @param params - SendOTPParams berisi uid, tenantId, role, nomorWa, nama
 * @returns SendOTPResult berisi success, config OTP untuk client (expiry, max_attempts, cooldown)
 */
export async function sendOTP(params: SendOTPParams): Promise<SendOTPResult> {
  // Baca config OTP dari config_registry
  const cfg = await getConfigValues('security_login')
  const otpDigits         = parseConfigNumber(cfg['otp_digits'], 6)
  const otpExpiryMenit    = parseConfigNumber(cfg['otp_expiry_minutes'], 5)
  const otpMaxAttempts    = parseConfigNumber(cfg['otp_max_attempts'], 3)
  const otpResendCooldown = parseConfigNumber(cfg['otp_resend_cooldown_seconds'], 60)

  // Generate kode OTP
  const kodeOTP   = generateOTPCode(otpDigits)
  const expiredAt = new Date(Date.now() + otpExpiryMenit * 60 * 1000)

  // Simpan ke DB via repository (hapus lama + insert baru)
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

  // Ambil Fonnte token via CredentialService
  const apiKey = await getCredential('fonnte', 'api_token')
  if (!apiKey) {
    console.error('[OTPService] Fonnte api_token tidak ditemukan')
    return { success: false, message: 'Konfigurasi WhatsApp belum siap' }
  }

  // Ambil nama platform
  const namaPlatform = await getNamaPlatform(params.tenantId)

  // Format waktu expired — timezone dari config_registry
  const timezone = await getPlatformTimezone()
  const expiredJam = expiredAt.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  })
  const expiredTanggal = expiredAt.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: timezone,
  })

  // Baca template pesan dari message_library
  const FALLBACK =
    '*Kode OTP Anda: {otp_code}*\n\n' +
    'Untuk masuk sebagai *{role}* di {nama_platform}.\n\n' +
    '⏰ Berlaku hingga pukul *{expired_jam} WIB* tanggal {expired_tanggal}.\n\n' +
    '🚫 *JANGAN berikan kode ini kepada siapapun*.'

  const template = await getMessage('notif_wa_otp_login', FALLBACK)
  const pesan    = interpolate(template, {
    otp_code:        kodeOTP,
    nama:            params.nama || params.role,
    role:            params.role,
    nama_platform:   namaPlatform,
    expired_jam:     expiredJam,
    expired_tanggal: expiredTanggal,
  })

  // Kirim via Fonnte API
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
    success:                 true,
    otp_expiry_minutes:      otpExpiryMenit,
    otp_max_attempts:        otpMaxAttempts,
    resend_cooldown_seconds: otpResendCooldown,
  }
}

// ─── FUNGSI: verifyAndConsume ────────────────────────────────────────────────
// Verifikasi kode OTP — atomic via SP (race-condition safe).
// Return: 'OK', 'EXPIRED', 'WRONG', 'NOT_FOUND', 'ALREADY_USED'
/**
 * Verifikasi kode OTP — atomic via SP, race-condition safe.
 * @param params - VerifyOTPParams berisi uid, tenantId, inputCode
 * @returns OTPVerifyResult: 'OK' | 'EXPIRED' | 'WRONG' | 'NOT_FOUND' | 'ALREADY_USED'
 */
export async function verifyAndConsume(
  params: VerifyOTPParams
): Promise<OTPVerifyResult> {
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

// ─── Re-export tipe ──────────────────────────────────────────────────────────
export type { OTPVerifyResult }
