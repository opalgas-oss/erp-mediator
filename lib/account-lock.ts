// lib/account-lock.ts
// Library server-side untuk mengelola account_locks di Firestore.
// Dipakai dari API routes — TIDAK boleh diimport di Client Component.
// Menggunakan Firebase Admin SDK dari lib/firebase-admin.ts — instance tunggal

import { getAdminDb } from '@/lib/firebase-admin'

// ─── Konstanta ────────────────────────────────────────────────────────────────
const TENANT_ID_DEFAULT = 'tenant_erpmediator'

// ─── Tipe Data Dokumen account_locks ─────────────────────────────────────────
export interface AccountLockDoc {
  uid:            string
  email:          string
  nama:           string
  nomor_wa:       string
  tenant_id:      string
  count:          number
  status:         'locked' | 'unlocked'
  lock_until:     Date | null
  locked_at:      Date | null
  unlock_at:      Date | null
  unlocked_by:    string | null
  unlock_method:  'auto' | 'manual' | null
  last_attempt_at?: Date
}

// ─── FUNGSI 1: getAccountLock ─────────────────────────────────────────────────
export async function getAccountLock(email: string): Promise<AccountLockDoc | null> {
  try {
    const db       = getAdminDb()
    const colRef   = db.collection('tenants').doc(TENANT_ID_DEFAULT).collection('account_locks')
    const snapshot = await colRef.where('email', '==', email).limit(1).get()

    if (snapshot.empty) return null

    return snapshot.docs[0].data() as AccountLockDoc
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
    const db     = getAdminDb()
    const docRef = db
      .collection('tenants')
      .doc(data.tenantId)
      .collection('account_locks')
      .doc(data.uid)

    const snap     = await docRef.get()
    const existing = snap.exists ? (snap.data() as Partial<AccountLockDoc>) : {}
    const sekarang = new Date()

    let startCount = existing.count || 0

    if (existing.status === 'locked' && existing.lock_until) {
      const lockUntilRaw  = existing.lock_until as unknown as { toDate?: () => Date }
      const lockUntilDate = typeof lockUntilRaw.toDate === 'function'
        ? lockUntilRaw.toDate()
        : new Date(existing.lock_until as unknown as string)

      if (lockUntilDate <= sekarang) {
        startCount = 0
        await docRef.set({ count: 0, status: 'unlocked' }, { merge: true })
      }
    }

    const countBaru = startCount + 1

    const platformRef  = db.doc('platform_config/policies/security_login/config')
    const platformSnap = await platformRef.get()
    const platformData = platformSnap.exists ? platformSnap.data() : {}
    const maxPercobaan = (platformData?.max_login_attempts as number) ?? 5
    const durasiMenit  = (platformData?.lock_duration_minutes as number) ?? 15

    if (countBaru >= maxPercobaan) {
      const lockUntil = new Date(sekarang.getTime() + durasiMenit * 60 * 1000)

      await docRef.set({
        uid:             data.uid,
        email:           data.email,
        nama:            data.nama,
        nomor_wa:        data.nomor_wa,
        tenant_id:       data.tenantId,
        count:           countBaru,
        status:          'locked',
        lock_until:      lockUntil,
        locked_at:       sekarang,
        unlock_at:       null,
        unlocked_by:     null,
        unlock_method:   null,
        last_attempt_at: sekarang,
      }, { merge: true })

      return { locked: true, lock_until: lockUntil, count: countBaru }
    } else {
      await docRef.set({
        uid:             data.uid,
        email:           data.email,
        nama:            data.nama,
        nomor_wa:        data.nomor_wa,
        tenant_id:       data.tenantId,
        count:           countBaru,
        status:          'unlocked',
        lock_until:      null,
        locked_at:       existing.locked_at || null,
        unlock_at:       null,
        unlocked_by:     null,
        unlock_method:   null,
        last_attempt_at: sekarang,
      }, { merge: true })

      return { locked: false, count: countBaru }
    }
  } catch (err) {
    console.error('[account-lock] incrementLockCount gagal:', err)
    throw err
  }
}

// ─── FUNGSI 3: unlockAccount ──────────────────────────────────────────────────
export async function unlockAccount(
  uid:             string,
  tenantId:        string,
  method:          'auto' | 'manual',
  unlockedByUid?:  string,
): Promise<{ success: boolean }> {
  try {
    const db     = getAdminDb()
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('account_locks')
      .doc(uid)

    const sekarang = new Date()

    const payload: Record<string, unknown> = {
      status:        'unlocked',
      unlock_method: method,
      unlock_at:     sekarang,
    }

    if (method === 'manual') {
      payload.unlocked_by = unlockedByUid || null
    } else {
      payload.count       = 0
      payload.unlocked_by = null
    }

    await docRef.update(payload)

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
}): Promise<{ success: boolean; reason?: string }> {
  const apiKey = process.env.FONNTE_API_KEY
  if (!apiKey) {
    console.warn('[account-lock] FONNTE_API_KEY tidak ada — notifikasi WA dikunci dilewati')
    return { success: false, reason: 'FONNTE_API_KEY tidak ada' }
  }

  const lockUntilWIB = data.lock_until.toLocaleTimeString('id-ID', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12:   false,
  })

  const pesan = `Halo ${data.nama},

Akun Anda di ERP Mediator dikunci karena terlalu banyak percobaan login yang gagal (${data.max_login_attempts} percobaan).

Akun akan terbuka kembali pada pukul ${lockUntilWIB} WIB.

Jika bukan Anda yang mencoba login, segera hubungi SuperAdmin:
${data.superadmin_email}

Abaikan pesan ini jika ini memang Anda.`

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        target:  data.nomor_wa,
        message: pesan,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('[account-lock] Fonnte return error:', response.status, body)
      return { success: false, reason: `HTTP ${response.status}: ${body}` }
    }

    return { success: true }
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error'
    console.error('[account-lock] sendLockNotificationWA error:', err)
    return { success: false, reason }
  }
}
