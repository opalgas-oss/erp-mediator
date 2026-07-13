// lib/account-lock.ts
// ⚠️ DEPRECATED Sesi #052 — Digantikan oleh:
//   lib/services/account-lock.service.ts (AccountLockService)
//   Semua route handler sudah diupdate ke import dari service.
//   File ini TIDAK BOLEH diimport dari file baru.
//   Akan dihapus setelah verifikasi tidak ada caller tersisa.
// Library server-side untuk mengelola account_locks di PostgreSQL.
// Dipakai dari API routes — TIDAK boleh diimport di Client Component.
//
// PERUBAHAN Sesi #041:
//   - incrementLockCount: tenantId bertipe string | null
//   - Query PRIMARY KEY: pakai email (bukan uid+tenant_id)
//   - INSERT/UPDATE diberi error checking eksplisit
//   - safeUid: existing.uid → data.uid → crypto.randomUUID()
//   - unlockAccount: update by email jika uid tidak cocok
//
// PERUBAHAN Sesi #042:
//   - sendLockNotificationWA: ganti hardcode 'Asia/Jakarta' → getPlatformTimezone()
//     Timezone sekarang dibaca dari config_registry (platform_general.platform_timezone)
//
// PERUBAHAN Sesi #049 — Step 7 ANALISIS v3:
//   - incrementLockCount() dipecah: orchestrator + 3 private helper
//   - Import konstanta dari lib/constants (ACCOUNT_LOCK_STATUS, UNLOCK_METHOD)
//   - Setiap fungsi ≤ 40 baris — sesuai standar Coding Standard

import 'server-only'
import { createServerSupabaseClient }        from '@/lib/supabase-server'
import { getMessage, interpolate }           from '@/lib/message-library'
import { getCredential }                     from '@/lib/credential-reader'
import { getConfigValues, parseConfigNumber, getPlatformTimezone } from '@/lib/config-registry'
import { ACCOUNT_LOCK_STATUS, UNLOCK_METHOD } from '@/lib/constants'
import type { AccountLockStatusType, UnlockMethodType } from '@/lib/constants'

// ─── Tipe Data Dokumen account_locks ─────────────────────────────────────────
export interface AccountLockDoc {
  uid:            string
  email:          string
  nama:           string
  nomor_wa:       string
  tenant_id:      string | null
  count:          number
  lock_count?:    number
  status:         AccountLockStatusType
  lock_until:     string | null
  locked_at:      string | null
  unlock_at:      string | null
  unlocked_by:    string | null
  unlock_method:  UnlockMethodType | null
  last_attempt_at?: string
}

// ─── Tipe internal untuk data input incrementLockCount ───────────────────────
interface IncrementInput {
  uid:      string
  email:    string
  nama:     string
  nomor_wa: string
  tenantId: string | null
}

// ─── Tipe internal untuk hasil buildLockPayload ──────────────────────────────
interface LockPayloadResult {
  payload: Record<string, unknown>
  locked:  boolean
  lockUntil?: Date
}

// ─── FUNGSI 1: getAccountLock ─────────────────────────────────────────────────
/**
 * Ambil record account_locks berdasarkan email.
 * @param email - Email user yang dicari
 * @returns AccountLockDoc atau null jika tidak ditemukan
 * @deprecated Sesi #052 — Gunakan AccountLockService.getAccountLock()
 */
export async function getAccountLock(email: string): Promise<AccountLockDoc | null> {
  try {
    const db = createServerSupabaseClient()
    const { data, error } = await db
      .from('account_locks').select('*').eq('email', email).limit(1).maybeSingle()
    if (error || !data) return null
    return data as AccountLockDoc
  } catch (err) {
    console.error('[account-lock] getAccountLock gagal:', err)
    return null
  }
}

// ─── PRIVATE HELPER: checkAndResetExpiredLock ─────────────────────────────────
/**
 * Cek apakah lock sudah expired, reset count jika iya.
 * @param db - Supabase server client
 * @param existing - Record account_locks existing atau null
 * @param sekarang - Waktu saat ini
 * @returns startCount — 0 jika expired/baru, existing.count jika belum expired
 * @deprecated Sesi #052 — Logika sudah di SP sp_increment_lock_count
 */
async function checkAndResetExpiredLock(
  db: ReturnType<typeof createServerSupabaseClient>,
  existing: AccountLockDoc | null,
  sekarang: Date
): Promise<number> {
  if (!existing) return 0

  const startCount = existing.count || 0

  // Cek apakah lock sudah expired
  if (existing.status === ACCOUNT_LOCK_STATUS.LOCKED && existing.lock_until) {
    const lockUntilDate = new Date(existing.lock_until)
    if (lockUntilDate <= sekarang) {
      // Lock expired — reset count dan status
      const { error: resetError } = await db
        .from('account_locks')
        .update({ count: 0, status: ACCOUNT_LOCK_STATUS.UNLOCKED })
        .eq('email', existing.email)
      if (resetError) {
        console.error('[account-lock] reset expired lock gagal:', resetError)
      }
      return 0
    }
  }

  return startCount
}

// ─── PRIVATE HELPER: buildLockPayload ────────────────────────────────────────
/**
 * Bangun payload untuk INSERT/UPDATE berdasarkan count dan config.
 * @param data - Input data (uid, email, nama, nomor_wa, tenantId)
 * @param existing - Record existing atau null
 * @param countBaru - Jumlah percobaan gagal terbaru
 * @param sekarang - Waktu saat ini
 * @returns LockPayloadResult — payload, locked status, lockUntil
 * @deprecated Sesi #052 — Logika sudah di SP sp_increment_lock_count
 */
async function buildLockPayload(
  data: IncrementInput,
  existing: AccountLockDoc | null,
  countBaru: number,
  sekarang: Date
): Promise<LockPayloadResult> {
  const cfg          = await getConfigValues('security_login')
  const maxPercobaan = parseConfigNumber(cfg['max_login_attempts'],   5)
  const durasiMenit  = parseConfigNumber(cfg['lock_duration_minutes'], 15)

  const safeUid = existing?.uid || data.uid || crypto.randomUUID()

  const basePayload: Record<string, unknown> = {
    uid:             safeUid,
    email:           data.email,
    nama:            data.nama     || existing?.nama     || data.email,
    nomor_wa:        data.nomor_wa || existing?.nomor_wa || '',
    tenant_id:       data.tenantId,
    count:           countBaru,
    unlock_at:       null,
    unlocked_by:     null,
    unlock_method:   null,
    last_attempt_at: sekarang.toISOString(),
  }

  // Apakah sudah mencapai batas? → lock akun
  if (countBaru >= maxPercobaan) {
    const lockUntil = new Date(sekarang.getTime() + durasiMenit * 60 * 1000)
    return {
      payload: {
        ...basePayload,
        lock_count: (existing?.lock_count || 0) + 1,
        status:     ACCOUNT_LOCK_STATUS.LOCKED,
        lock_until: lockUntil.toISOString(),
        locked_at:  sekarang.toISOString(),
      },
      locked: true,
      lockUntil,
    }
  }

  // Belum mencapai batas — update count saja
  return {
    payload: {
      ...basePayload,
      lock_count: existing?.lock_count || 0,
      status:     ACCOUNT_LOCK_STATUS.UNLOCKED,
      lock_until: null,
      locked_at:  existing?.locked_at || null,
    },
    locked: false,
  }
}

// ─── PRIVATE HELPER: executeLockOperation ────────────────────────────────────
/**
 * Eksekusi INSERT (record baru) atau UPDATE (record existing) ke DB.
 * @param db - Supabase server client
 * @param email - Email sebagai key lookup
 * @param payload - Data yang akan di-insert/update
 * @param existing - Record existing atau null (menentukan INSERT vs UPDATE)
 * @throws Error jika operasi DB gagal
 * @deprecated Sesi #052 — Logika sudah di SP sp_increment_lock_count
 */
async function executeLockOperation(
  db: ReturnType<typeof createServerSupabaseClient>,
  email: string,
  payload: Record<string, unknown>,
  existing: AccountLockDoc | null
): Promise<void> {
  if (existing) {
    const { error } = await db.from('account_locks').update(payload).eq('email', email)
    if (error) {
      console.error('[account-lock] update gagal:', error)
      throw new Error(error.message)
    }
  } else {
    const { error } = await db.from('account_locks').insert(payload)
    if (error) {
      console.error('[account-lock] insert gagal:', error)
      throw new Error(error.message)
    }
  }
}

// ─── FUNGSI 2: incrementLockCount ────────────────────────────────────────────
/**
 * Orchestrator: cek expired → hitung count → bangun payload → eksekusi DB.
 * @param data - IncrementInput (uid, email, nama, nomor_wa, tenantId)
 * @returns Object berisi locked (boolean), lock_until (Date|undefined), count (number)
 * @throws Error jika operasi DB gagal
 * @deprecated Sesi #052 — Gunakan AccountLockService.incrementLockCount()
 */
export async function incrementLockCount(data: IncrementInput): Promise<{
  locked: boolean
  lock_until?: Date
  count: number
}> {
  try {
    const db       = createServerSupabaseClient()
    const sekarang = new Date()

    // 1. Ambil record existing
    const { data: existing } = await db
      .from('account_locks')
      .select('*')
      .eq('email', data.email)
      .maybeSingle()

    // 2. Cek dan reset expired lock
    const startCount = await checkAndResetExpiredLock(db, existing as AccountLockDoc | null, sekarang)

    // 3. Hitung count baru
    const countBaru = startCount + 1

    // 4. Bangun payload berdasarkan count dan config
    const { payload, locked, lockUntil } = await buildLockPayload(
      data, existing as AccountLockDoc | null, countBaru, sekarang
    )

    // 5. Eksekusi ke DB
    await executeLockOperation(db, data.email, payload, existing as AccountLockDoc | null)

    return { locked, lock_until: lockUntil, count: countBaru }
  } catch (err) {
    console.error('[account-lock] incrementLockCount gagal:', err)
    throw err
  }
}

// ─── FUNGSI 3: unlockAccount ──────────────────────────────────────────────────
/**
 * Unlock akun yang terkunci — support auto (expired) dan manual (SuperAdmin).
 * @param uid - UID user yang di-unlock
 * @param tenantId - Tenant ID atau null untuk SUPERADMIN
 * @param method - Metode unlock: AUTO atau MANUAL
 * @param unlockedByUid - UID admin yang melakukan unlock (hanya untuk MANUAL)
 * @param email - Email fallback jika uid tidak cocok
 * @returns Object berisi success (boolean)
 * @throws Error jika operasi DB gagal
 * @deprecated Sesi #052 — Gunakan AccountLockService.unlockAccount() dengan object param
 */
export async function unlockAccount(
  uid:            string,
  tenantId:       string | null,
  method:         UnlockMethodType,
  unlockedByUid?: string,
  email?:         string,
): Promise<{ success: boolean }> {
  try {
    const db       = createServerSupabaseClient()
    const sekarang = new Date()
    const payload: Record<string, unknown> = {
      status:        ACCOUNT_LOCK_STATUS.UNLOCKED,
      unlock_method: method,
      unlock_at:     sekarang.toISOString(),
    }
    if (method === UNLOCK_METHOD.MANUAL) {
      payload['unlocked_by'] = unlockedByUid || null
    } else {
      payload['count'] = 0
      payload['unlocked_by'] = null
    }

    // Coba update by uid dulu
    if (uid) {
      const { data: existing } = await db
        .from('account_locks').select('uid').eq('uid', uid).maybeSingle()
      if (existing) {
        await db.from('account_locks').update(payload).eq('uid', uid)
        return { success: true }
      }
    }

    // Fallback: update by email jika uid tidak cocok
    if (email) {
      await db.from('account_locks').update(payload).eq('email', email)
    }

    return { success: true }
  } catch (err) {
    console.error('[account-lock] unlockAccount gagal:', err)
    throw err
  }
}

// ─── FUNGSI 4: sendLockNotificationWA ────────────────────────────────────────
/**
 * Kirim notifikasi WhatsApp via Fonnte saat akun dikunci.
 * @param data - Object berisi nomor_wa, nama, lock_until, max_login_attempts, superadmin_email, tenantId
 * @returns Object berisi success (boolean) dan reason (string, jika gagal)
 * @deprecated Sesi #052 — Gunakan AccountLockService.sendLockNotificationWA()
 */
export async function sendLockNotificationWA(data: {
  nomor_wa:           string
  nama:               string
  lock_until:         Date
  max_login_attempts: number
  superadmin_email:   string
  tenantId?:          string | null
}): Promise<{ success: boolean; reason?: string }> {

  // Ambil API token Fonnte dari credential DB
  const apiKey = await getCredential('fonnte', 'api_token')
  if (!apiKey) {
    console.warn('[account-lock] Fonnte api_token tidak ditemukan di DB maupun env')
    return { success: false, reason: 'Fonnte api_token tidak ditemukan' }
  }
  console.log('[account-lock] Fonnte token prefix:', apiKey.slice(0, 8), '| length:', apiKey.length)

  // Ambil nama platform dari tenant
  const db = createServerSupabaseClient()
  let namaPlatform = ''
  try {
    if (data.tenantId) {
      const { data: tenantRow } = await db
        .from('tenants').select('nama_brand').eq('id', data.tenantId).single()
      namaPlatform = tenantRow?.nama_brand ?? ''
    }
    if (!namaPlatform) {
      const { data: tenantRow } = await db
        .from('tenants').select('nama_brand').eq('status', 'aktif').limit(1).single()
      namaPlatform = tenantRow?.nama_brand ?? ''
    }
  } catch { /* tetap lanjut tanpa nama platform */ }

  // Format waktu kunci — timezone dari config_registry (bukan hardcode)
  const timezone   = await getPlatformTimezone()
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
      console.error('[account-lock] Fonnte HTTP error:', response.status, JSON.stringify(responseBody))
      return { success: false, reason: `HTTP ${response.status}: ${JSON.stringify(responseBody)}` }
    }
    console.log('[account-lock] Fonnte response:', JSON.stringify(responseBody), '| target:', data.nomor_wa)
    return { success: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    console.error('[account-lock] sendLockNotificationWA error:', err)
    return { success: false, reason }
  }
}
