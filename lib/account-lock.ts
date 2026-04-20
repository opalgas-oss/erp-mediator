// lib/account-lock.ts
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

import 'server-only'
import { createServerSupabaseClient }        from '@/lib/supabase-server'
import { getMessage, interpolate }           from '@/lib/message-library'
import { getCredential }                     from '@/lib/credential-reader'
import { getConfigValues, parseConfigNumber, getPlatformTimezone } from '@/lib/config-registry'

// ─── Tipe Data Dokumen account_locks ─────────────────────────────────────────
export interface AccountLockDoc {
  uid:            string
  email:          string
  nama:           string
  nomor_wa:       string
  tenant_id:      string | null
  count:          number
  lock_count?:    number
  status:         'locked' | 'unlocked'
  lock_until:     string | null
  locked_at:      string | null
  unlock_at:      string | null
  unlocked_by:    string | null
  unlock_method:  'auto' | 'manual' | null
  last_attempt_at?: string
}

// ─── FUNGSI 1: getAccountLock ─────────────────────────────────────────────────
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

// ─── FUNGSI 2: incrementLockCount ────────────────────────────────────────────
export async function incrementLockCount(data: {
  uid:      string
  email:    string
  nama:     string
  nomor_wa: string
  tenantId: string | null
}): Promise<{ locked: boolean; lock_until?: Date; count: number }> {
  try {
    const db       = createServerSupabaseClient()
    const sekarang = new Date()

    const { data: existing } = await db
      .from('account_locks')
      .select('*')
      .eq('email', data.email)
      .maybeSingle()

    let startCount = existing?.count || 0

    if (existing?.status === 'locked' && existing?.lock_until) {
      const lockUntilDate = new Date(existing.lock_until)
      if (lockUntilDate <= sekarang) {
        startCount = 0
        const { error: resetError } = await db
          .from('account_locks')
          .update({ count: 0, status: 'unlocked' })
          .eq('email', data.email)
        if (resetError) console.error('[account-lock] reset expired lock gagal:', resetError)
      }
    }

    const countBaru = startCount + 1

    const cfg          = await getConfigValues('security_login')
    const maxPercobaan = parseConfigNumber(cfg['max_login_attempts'],   5)
    const durasiMenit  = parseConfigNumber(cfg['lock_duration_minutes'], 15)

    const safeUid = existing?.uid || data.uid || crypto.randomUUID()

    const basePayload = {
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

    if (countBaru >= maxPercobaan) {
      const lockUntil = new Date(sekarang.getTime() + durasiMenit * 60 * 1000)
      const payload = {
        ...basePayload,
        lock_count: (existing?.lock_count || 0) + 1,
        status:     'locked'  as const,
        lock_until: lockUntil.toISOString(),
        locked_at:  sekarang.toISOString(),
      }

      if (existing) {
        const { error } = await db.from('account_locks').update(payload).eq('email', data.email)
        if (error) { console.error('[account-lock] update lock gagal:', error); throw new Error(error.message) }
      } else {
        const { error } = await db.from('account_locks').insert(payload)
        if (error) { console.error('[account-lock] insert lock gagal:', error); throw new Error(error.message) }
      }
      return { locked: true, lock_until: lockUntil, count: countBaru }

    } else {
      const payload = {
        ...basePayload,
        lock_count: existing?.lock_count || 0,
        status:     'unlocked' as const,
        lock_until: null,
        locked_at:  existing?.locked_at || null,
      }

      if (existing) {
        const { error } = await db.from('account_locks').update(payload).eq('email', data.email)
        if (error) { console.error('[account-lock] update count gagal:', error); throw new Error(error.message) }
      } else {
        const { error } = await db.from('account_locks').insert(payload)
        if (error) { console.error('[account-lock] insert count gagal:', error); throw new Error(error.message) }
      }
      return { locked: false, count: countBaru }
    }

  } catch (err) {
    console.error('[account-lock] incrementLockCount gagal:', err)
    throw err
  }
}

// ─── FUNGSI 3: unlockAccount ──────────────────────────────────────────────────
export async function unlockAccount(
  uid:            string,
  tenantId:       string | null,
  method:         'auto' | 'manual',
  unlockedByUid?: string,
  email?:         string,
): Promise<{ success: boolean }> {
  try {
    const db       = createServerSupabaseClient()
    const sekarang = new Date()
    const payload: Record<string, unknown> = {
      status:        'unlocked',
      unlock_method: method,
      unlock_at:     sekarang.toISOString(),
    }
    if (method === 'manual') { payload['unlocked_by'] = unlockedByUid || null }
    else                     { payload['count'] = 0; payload['unlocked_by'] = null }

    if (uid) {
      const { data: existing } = await db
        .from('account_locks').select('uid').eq('uid', uid).maybeSingle()
      if (existing) {
        await db.from('account_locks').update(payload).eq('uid', uid)
        return { success: true }
      }
    }

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
export async function sendLockNotificationWA(data: {
  nomor_wa:           string
  nama:               string
  lock_until:         Date
  max_login_attempts: number
  superadmin_email:   string
  tenantId?:          string | null
}): Promise<{ success: boolean; reason?: string }> {

  const apiKey = await getCredential('fonnte', 'api_token')
  if (!apiKey) {
    console.warn('[account-lock] Fonnte api_token tidak ditemukan di DB maupun env')
    return { success: false, reason: 'Fonnte api_token tidak ditemukan' }
  }
  console.log('[account-lock] Fonnte token prefix:', apiKey.slice(0, 8), '| length:', apiKey.length)

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

  // ── Format waktu kunci — timezone dari config_registry (bukan hardcode) ────
  const timezone   = await getPlatformTimezone()
  const lockUntilWIB = data.lock_until.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  })

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
