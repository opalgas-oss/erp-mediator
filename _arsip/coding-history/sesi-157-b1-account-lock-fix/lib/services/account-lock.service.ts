// lib/services/account-lock.service.ts
// Service layer untuk manajemen account lock — logika bisnis.
// Panggil repository untuk DB. Panggil config-registry untuk konfigurasi.
// Dibuat: Sesi #052 — BLOK C-01 TODO_ARSITEKTUR_LAYER_v1
//
// ARSITEKTUR:
//   Route Handler → AccountLockService → AccountLockRepository → SP/DB
//   AccountLockService juga panggil: config-registry, message-library, credential-reader

import 'server-only'
import {
  findByEmail,
  spIncrementLockCount,
  spUnlockAccount,
  type AccountLockDoc,
  type IncrementLockResult,
  type UnlockResult,
} from '@/lib/repositories/account-lock.repository'
import { getConfigValues, parseConfigNumber, parseConfigBoolean, getPlatformTimezone } from '@/lib/config-registry'
import { getMessage, interpolate } from '@/lib/message-library'
import { getCredential } from '@/lib/services/credential.service'
import {
  findNamaBrandById,
  findDefaultNamaBrand,
} from '@/lib/repositories/tenant.repository'
import { ACCOUNT_LOCK_STATUS, UNLOCK_METHOD } from '@/lib/constants'
import type { UnlockMethodType } from '@/lib/constants'

// ─── Tipe untuk unlockAccount (object param — maks 4 param terpenuhi) ────────

export interface UnlockAccountParams {
  uid:            string
  email?:         string
  method:         UnlockMethodType
  unlockedByUid?: string
}

// ─── Tipe untuk sendLockNotificationWA ───────────────────────────────────────

export interface LockNotificationParams {
  nomor_wa:           string
  nama:               string
  lock_until:         Date
  max_login_attempts: number
  superadmin_email:   string
  tenantId?:          string | null
}

// ─── Tipe untuk incrementLockCount ───────────────────────────────────────────

export interface IncrementLockParams {
  uid:      string
  email:    string
  nama:     string
  nomor_wa: string
  tenantId: string | null
}

// ─── FUNGSI: getAccountLock ──────────────────────────────────────────────────
// Ambil record account_locks berdasarkan email.
// Delegasi langsung ke repository — tidak ada logika bisnis.
/**
 * Ambil record lock berdasarkan email — delegasi ke repository.
 * @param email - Email user yang dicari
 * @returns AccountLockDoc jika ada, null jika belum pernah gagal login
 */
export async function getAccountLock(email: string): Promise<AccountLockDoc | null> {
  try {
    return await findByEmail(email)
  } catch (err) {
    console.error('[AccountLockService] getAccountLock gagal:', err)
    return null
  }
}

// ─── FUNGSI: incrementLockCount ──────────────────────────────────────────────
// Orchestrator: baca config → panggil SP via repository → return hasil.
// Semua logika atomik (cek expired, increment, lock) sudah di SP.
/**
 * Baca config → panggil SP via repository — atomic increment + lock.
 * @param data - IncrementLockParams berisi uid, email, nama, nomor_wa, tenantId
 * @returns Object berisi locked, lock_until, count, lock_count
 */
export async function incrementLockCount(data: IncrementLockParams): Promise<{
  locked:      boolean
  lock_until?: string | null
  count:       number
  lock_count:  number
}> {
  // Baca konfigurasi dari config_registry (dengan cache)
  const cfg          = await getConfigValues('security_login')
  const maxPercobaan = parseConfigNumber(cfg['max_login_attempts'], 5)
  const durasiMenit  = parseConfigNumber(cfg['lock_duration_minutes'], 15)

  // Panggil SP via repository — atomic, race-condition safe
  const result: IncrementLockResult = await spIncrementLockCount({
    email:                 data.email,
    uid:                   data.uid,
    nama:                  data.nama,
    nomor_wa:              data.nomor_wa,
    tenant_id:             data.tenantId,
    max_attempts:          maxPercobaan,
    lock_duration_minutes: durasiMenit,
  })

  return {
    locked:     result.locked,
    lock_until: result.lock_until,
    count:      result.count,
    lock_count: result.lock_count,
  }
}

// ─── FUNGSI: unlockAccount ───────────────────────────────────────────────────
// Unlock akun — object param (refactor dari 5 param → 1 object).
// Delegasi ke SP via repository.
/**
 * Unlock akun — object param (refactor dari 5 param ke 1 object).
 * @param params - UnlockAccountParams berisi uid, email, method, unlockedByUid
 * @returns UnlockResult berisi success dan matched_by
 */
export async function unlockAccount(params: UnlockAccountParams): Promise<UnlockResult> {
  try {
    return await spUnlockAccount({
      uid:         params.uid || null,
      email:       params.email || null,
      method:      params.method,
      unlocked_by: params.unlockedByUid || null,
    })
  } catch (err) {
    console.error('[AccountLockService] unlockAccount gagal:', err)
    return { success: false, matched_by: null }
  }
}

// ─── PRIVATE: ambil nama platform dari tabel tenants via repository ───────────
async function getNamaPlatform(tenantId?: string | null): Promise<string> {
  try {
    if (tenantId) {
      const tenant = await findNamaBrandById(tenantId)
      if (tenant?.nama_brand) return tenant.nama_brand
    }
    // Fallback: ambil tenant aktif pertama
    const defaultTenant = await findDefaultNamaBrand()
    return defaultTenant?.nama_brand ?? ''
  } catch {
    return ''
  }
}

// ─── FUNGSI: sendLockNotificationWA ──────────────────────────────────────────
// Kirim notifikasi WhatsApp via Fonnte saat akun dikunci.
// Credential Fonnte dibaca via credential-reader (akan migrasi ke CredentialService).
/**
 * Kirim notifikasi WhatsApp via Fonnte saat akun dikunci.
 * Cek config notify_superadmin_on_lock sebelum kirim.
 * @param data - LockNotificationParams berisi nomor_wa, nama, lock_until, dll
 * @returns Object berisi success dan reason (jika gagal)
 */
export async function sendLockNotificationWA(
  data: LockNotificationParams
): Promise<{ success: boolean; reason?: string }> {
  // Cek config: apakah notifikasi diaktifkan?
  const cfg = await getConfigValues('security_login')
  const notifEnabled = parseConfigBoolean(cfg['notify_superadmin_on_lock'], true)
  if (!notifEnabled) {
    return { success: true, reason: 'Notifikasi dinonaktifkan di config' }
  }

  // Ambil API token Fonnte dari credential DB
  const apiKey = await getCredential('fonnte', 'api_token')
  if (!apiKey) {
    console.warn('[AccountLockService] Fonnte api_token tidak ditemukan')
    return { success: false, reason: 'Fonnte api_token tidak ditemukan' }
  }

  // Ambil nama platform
  const namaPlatform = await getNamaPlatform(data.tenantId)

  // Format waktu kunci — timezone dari config_registry
  const timezone    = await getPlatformTimezone()
  const lockUntilWIB = data.lock_until.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  })

  // Template pesan — dari message_library, fallback hardcode
  const TEMPLATE_FALLBACK =
    'Halo {nama},\n\n' +
    'Akun Anda di {nama_platform} dikunci karena terlalu banyak percobaan login yang gagal ({max_login_attempts} percobaan).\n\n' +
    'Akun akan terbuka kembali pada pukul {lock_until_wib} WIB.\n\n' +
    'Jika bukan Anda yang mencoba login, segera hubungi SuperAdmin:\n{superadmin_email}\n\n' +
    'Abaikan pesan ini jika ini memang Anda.'

  const template = await getMessage('notif_wa_akun_dikunci', TEMPLATE_FALLBACK)
  const pesan    = interpolate(template, {
    nama:               data.nama,
    nama_platform:      namaPlatform,
    max_login_attempts: String(data.max_login_attempts),
    lock_until_wib:     lockUntilWIB,
    superadmin_email:   data.superadmin_email,
  })

  // Kirim via Fonnte API
  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ target: data.nomor_wa, message: pesan }),
    })
    const responseBody = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('[AccountLockService] Fonnte HTTP error:', response.status)
      return { success: false, reason: `HTTP ${response.status}` }
    }
    return { success: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    console.error('[AccountLockService] sendLockNotificationWA error:', err)
    return { success: false, reason }
  }
}
