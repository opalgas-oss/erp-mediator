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

export interface UnlockAccountParams {
  uid:            string
  email?:         string
  method:         UnlockMethodType
  unlockedByUid?: string
}

export interface LockNotificationParams {
  nomor_wa:           string
  nama:               string
  lock_until:         Date
  max_login_attempts: number
  superadmin_email:   string
  tenantId?:          string | null
}

export interface IncrementLockParams {
  uid:      string
  email:    string
  nama:     string
  nomor_wa: string
  tenantId: string | null
}

export async function getAccountLock(email: string): Promise<AccountLockDoc | null> {
  try {
    return await findByEmail(email)
  } catch (err) {
    console.error('[AccountLockService] getAccountLock gagal:', err)
    return null
  }
}

// FIX Sesi #157 — B1-03: key config salah → nilai selalu fallback 15 menit
// FIX T-035 Sesi #166: baca progressive_lockout_enabled + max_lock_duration_hours
export async function incrementLockCount(data: IncrementLockParams): Promise<{
  locked:      boolean
  lock_until?: string | null
  count:       number
  lock_count:  number
}> {
  const cfg                = await getConfigValues('security_login')
  const maxPercobaan       = parseConfigNumber(cfg['max_login_attempts'], 5)
  const durasiMenit        = parseConfigNumber(cfg['lockout_duration_minutes'], 30)
  const progressiveEnabled = parseConfigBoolean(cfg['progressive_lockout_enabled'], false)
  const maxLockJam         = parseConfigNumber(cfg['max_lock_duration_hours'], 24)
  const maxLockMenit       = maxLockJam * 60

  const result: IncrementLockResult = await spIncrementLockCount({
    email:                      data.email,
    uid:                        data.uid,
    nama:                       data.nama,
    nomor_wa:                   data.nomor_wa,
    tenant_id:                  data.tenantId,
    max_attempts:               maxPercobaan,
    lock_duration_minutes:      durasiMenit,
    progressive_enabled:        progressiveEnabled,
    max_lock_duration_minutes:  maxLockMenit,
  })

  return {
    locked:     result.locked,
    lock_until: result.lock_until,
    count:      result.count,
    lock_count: result.lock_count,
  }
}

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

async function getNamaPlatform(tenantId?: string | null): Promise<string> {
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

export async function sendLockNotificationWA(
  data: LockNotificationParams
): Promise<{ success: boolean; reason?: string }> {
  const cfg = await getConfigValues('security_login')
  const notifEnabled = parseConfigBoolean(cfg['notify_superadmin_on_lock'], true)
  if (!notifEnabled) return { success: true, reason: 'Notifikasi dinonaktifkan di config' }

  const apiKey = await getCredential('fonnte', 'api_token')
  if (!apiKey) {
    console.warn('[AccountLockService] Fonnte api_token tidak ditemukan')
    return { success: false, reason: 'Fonnte api_token tidak ditemukan' }
  }

  const namaPlatform = await getNamaPlatform(data.tenantId)
  const timezone     = await getPlatformTimezone()
  const lockUntilWIB = data.lock_until.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  })

  const TEMPLATE_FALLBACK =
    'Halo {nama},\n\nAkun Anda di {nama_platform} dikunci karena terlalu banyak percobaan login yang gagal ({max_login_attempts} percobaan).\n\nAkun akan terbuka kembali pada pukul {lock_until_wib} WIB.\n\nJika bukan Anda yang mencoba login, segera hubungi SuperAdmin:\n{superadmin_email}\n\nAbaikan pesan ini jika ini memang Anda.'

  const template = await getMessage('notif_wa_akun_dikunci', TEMPLATE_FALLBACK)
  const pesan    = interpolate(template, {
    nama:               data.nama,
    nama_platform:      namaPlatform,
    max_login_attempts: String(data.max_login_attempts),
    lock_until_wib:     lockUntilWIB,
    superadmin_email:   data.superadmin_email,
  })

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ target: data.nomor_wa, message: pesan }),
    })
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
