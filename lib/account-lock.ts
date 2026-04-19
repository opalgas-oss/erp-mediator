// lib/account-lock.ts
// Library server-side untuk mengelola account_locks di PostgreSQL.
// Dipakai dari API routes — TIDAK boleh diimport di Client Component.
//
// PERUBAHAN dari versi Firebase:
//   - Import Firebase Admin → Supabase server client
//   - Semua operasi Firestore → operasi tabel account_locks PostgreSQL
//   - TENANT_ID_DEFAULT dihapus — tenantId selalu dipass sebagai parameter
//   - Tambah import 'server-only'
//
// PERUBAHAN Sesi #037:
//   - sendLockNotificationWA: hapus template WA hardcode
//   - Template WA dibaca dari tabel message_library (key: notif_wa_akun_dikunci)
//   - Fonnte API token dibaca dari instance_credentials via getCredential()
//   - Fallback otomatis ke FONNTE_API_KEY env var jika DB belum ada data

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMessage, interpolate }    from '@/lib/message-library'
import { getCredential }              from '@/lib/credential-reader'

// ─── Tipe Data Dokumen account_locks ─────────────────────────────────────────
export interface AccountLockDoc {
  uid:            string
  email:          string
  nama:           string
  nomor_wa:       string
  tenant_id:      string
  count:          number
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
      .from('account_locks').select('*').eq('email', email).limit(1).single()
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
  tenantId: string
}): Promise<{ locked: boolean; lock_until?: Date; count: number }> {
  try {
    const db       = createServerSupabaseClient()
    const sekarang = new Date()

    const { data: existing } = await db
      .from('account_locks').select('*')
      .eq('uid', data.uid).eq('tenant_id', data.tenantId).single()

    let startCount = existing?.count || 0

    if (existing?.status === 'locked' && existing?.lock_until) {
      const lockUntilDate = new Date(existing.lock_until)
      if (lockUntilDate <= sekarang) {
        startCount = 0
        await db.from('account_locks')
          .update({ count: 0, status: 'unlocked' })
          .eq('uid', data.uid).eq('tenant_id', data.tenantId)
      }
    }

    const countBaru = startCount + 1

    const { data: policyData } = await db
      .from('platform_policies').select('nilai').eq('feature_key', 'security_login').single()

    const policy       = (policyData?.nilai || {}) as Record<string, unknown>
    const maxPercobaan = typeof policy['max_login_attempts']    === 'number' ? policy['max_login_attempts']    : 5
    const durasiMenit  = typeof policy['lock_duration_minutes'] === 'number' ? policy['lock_duration_minutes'] : 15

    if (countBaru >= maxPercobaan) {
      const lockUntil = new Date(sekarang.getTime() + durasiMenit * 60 * 1000)
      await db.from('account_locks').upsert({
        uid: data.uid, email: data.email, nama: data.nama, nomor_wa: data.nomor_wa,
        tenant_id: data.tenantId, count: countBaru,
        lock_count: (existing?.lock_count || 0) + 1,
        status: 'locked', lock_until: lockUntil.toISOString(),
        locked_at: sekarang.toISOString(), unlock_at: null,
        unlocked_by: null, unlock_method: null,
        last_attempt_at: sekarang.toISOString(),
      }, { onConflict: 'tenant_id,uid' })
      return { locked: true, lock_until: lockUntil, count: countBaru }
    } else {
      await db.from('account_locks').upsert({
        uid: data.uid, email: data.email, nama: data.nama, nomor_wa: data.nomor_wa,
        tenant_id: data.tenantId, count: countBaru,
        lock_count: existing?.lock_count || 0,
        status: 'unlocked', lock_until: null,
        locked_at: existing?.locked_at || null, unlock_at: null,
        unlocked_by: null, unlock_method: null,
        last_attempt_at: sekarang.toISOString(),
      }, { onConflict: 'tenant_id,uid' })
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
  tenantId:       string,
  method:         'auto' | 'manual',
  unlockedByUid?: string,
): Promise<{ success: boolean }> {
  try {
    const db       = createServerSupabaseClient()
    const sekarang = new Date()
    const payload: Record<string, unknown> = {
      status: 'unlocked', unlock_method: method, unlock_at: sekarang.toISOString(),
    }
    if (method === 'manual') { payload['unlocked_by'] = unlockedByUid || null }
    else                     { payload['count'] = 0; payload['unlocked_by'] = null }
    await db.from('account_locks').update(payload).eq('uid', uid).eq('tenant_id', tenantId)
    return { success: true }
  } catch (err) {
    console.error('[account-lock] unlockAccount gagal:', err)
    throw err
  }
}

// ─── FUNGSI 4: sendLockNotificationWA ────────────────────────────────────────
// API token Fonnte dibaca dari instance_credentials via getCredential().
// Fallback otomatis ke FONNTE_API_KEY env var jika credentials belum di-seed ke DB.
// Template WA dibaca dari message_library (key: notif_wa_akun_dikunci).

export async function sendLockNotificationWA(data: {
  nomor_wa:           string
  nama:               string
  lock_until:         Date
  max_login_attempts: number
  superadmin_email:   string
}): Promise<{ success: boolean; reason?: string }> {

  // Baca API token dari DB → fallback ke env otomatis via credential-reader
  const apiKey = await getCredential('fonnte', 'api_token')
  if (!apiKey) {
    console.warn('[account-lock] Fonnte api_token tidak ditemukan di DB maupun env')
    return { success: false, reason: 'Fonnte api_token tidak ditemukan' }
  }

  const lockUntilWIB = data.lock_until.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false,
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
    nama_platform:      'ERP Mediator',
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
      const body = await response.text()
      console.error('[account-lock] Fonnte error:', response.status, body)
      return { success: false, reason: `HTTP ${response.status}: ${body}` }
    }
    return { success: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    console.error('[account-lock] sendLockNotificationWA error:', err)
    return { success: false, reason }
  }
}
