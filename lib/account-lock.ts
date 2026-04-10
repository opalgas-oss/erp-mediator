// lib/account-lock.ts
// Library server-side untuk mengelola account_locks di Firestore.
// Dipakai dari API routes — TIDAK boleh diimport di Client Component.
// Menggunakan Firebase Admin SDK untuk operasi Firestore di sisi server.

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore }                  from 'firebase-admin/firestore'
import { getEffectivePolicy }            from '@/lib/policy'

// ─── Konstanta ────────────────────────────────────────────────────────────────

// Tenant ID aktif — dipakai di getAccountLock yang tidak terima tenantId sebagai param
const TENANT_ID_DEFAULT = 'tenant_erpmediator'

// ─── Inisialisasi Firebase Admin ─────────────────────────────────────────────
// Hanya inisialisasi sekali — getApps() mencegah duplikasi instance di hot-reload

function initAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
  return getFirestore()
}

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
}

// ─── FUNGSI 1: getAccountLock ─────────────────────────────────────────────────

/**
 * Cari dokumen account_lock berdasarkan email di tenant aktif.
 * Query ke: /tenants/tenant_erpmediator/account_locks/ WHERE email == email
 *
 * @param email - Alamat email yang ingin dicari status kuncinya
 * @returns Data dokumen account_lock atau null jika tidak ditemukan
 */
export async function getAccountLock(email: string): Promise<AccountLockDoc | null> {
  try {
    const db       = initAdmin()
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

/**
 * Tambah counter percobaan login gagal untuk user tertentu.
 * Kalau counter mencapai batas dari policy → kunci akun dan set lock_until.
 * Kalau belum mencapai batas → simpan count saja, status tetap unlocked.
 *
 * Batas percobaan dan durasi kunci dibaca dari getEffectivePolicy — TIDAK hardcode.
 *
 * @returns { locked, lock_until?, count } — locked true jika akun baru saja dikunci
 */
export async function incrementLockCount(data: {
  uid:      string
  email:    string
  nama:     string
  nomor_wa: string
  tenantId: string
}): Promise<{ locked: boolean; lock_until?: Date; count: number }> {
  try {
    const db     = initAdmin()
    const docRef = db
      .collection('tenants')
      .doc(data.tenantId)
      .collection('account_locks')
      .doc(data.uid)

    // Baca dokumen existing untuk ambil count lama
    const snap      = await docRef.get()
    const existing  = snap.exists ? (snap.data() as Partial<AccountLockDoc>) : {}
    const countBaru = (existing.count || 0) + 1

    // Baca batas dan durasi kunci dari policy — TIDAK boleh hardcode
    const loginPolicy  = await getEffectivePolicy(data.tenantId, 'security_login')
    const maxPercobaan = loginPolicy.max_login_attempts
    const durasiMenit  = loginPolicy.lock_duration_minutes

    const sekarang = new Date()

    if (countBaru >= maxPercobaan) {
      // ── Akun dikunci ──────────────────────────────────────────────────────
      const lockUntil = new Date(sekarang.getTime() + durasiMenit * 60 * 1000)

      await docRef.set({
        uid:           data.uid,
        email:         data.email,
        nama:          data.nama,
        nomor_wa:      data.nomor_wa,
        tenant_id:     data.tenantId,
        count:         countBaru,
        status:        'locked',
        lock_until:    lockUntil,
        locked_at:     sekarang,
        unlock_at:     null,
        unlocked_by:   null,
        unlock_method: null,
      }, { merge: true })

      return { locked: true, lock_until: lockUntil, count: countBaru }
    } else {
      // ── Belum mencapai batas — simpan count saja ──────────────────────────
      await docRef.set({
        uid:           data.uid,
        email:         data.email,
        nama:          data.nama,
        nomor_wa:      data.nomor_wa,
        tenant_id:     data.tenantId,
        count:         countBaru,
        status:        'unlocked',
        lock_until:    null,
        locked_at:     existing.locked_at || null,
        unlock_at:     null,
        unlocked_by:   null,
        unlock_method: null,
      }, { merge: true })

      return { locked: false, count: countBaru }
    }
  } catch (err) {
    console.error('[account-lock] incrementLockCount gagal:', err)
    throw err
  }
}

// ─── FUNGSI 3: unlockAccount ──────────────────────────────────────────────────

/**
 * Buka kunci akun — bisa manual oleh admin atau auto oleh sistem.
 * - method "manual": catat siapa yang membuka (unlocked_by = uid admin)
 * - method "auto":   reset counter ke 0 agar user mulai dari awal
 *
 * @param uid            - UID user yang akan dibuka kuncinya
 * @param tenantId       - Tenant ID tempat user terdaftar
 * @param method         - "auto" (sistem) atau "manual" (admin)
 * @param unlockedByUid  - UID admin yang membuka kunci (wajib jika method "manual")
 * @returns { success: true } jika berhasil
 */
export async function unlockAccount(
  uid:             string,
  tenantId:        string,
  method:          'auto' | 'manual',
  unlockedByUid?:  string,
): Promise<{ success: boolean }> {
  try {
    const db     = initAdmin()
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
      // Manual: catat UID admin yang membuka kunci
      payload.unlocked_by = unlockedByUid || null
    } else {
      // Auto: reset counter agar user bisa coba dari awal
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

/**
 * Kirim notifikasi WhatsApp via Fonnte saat akun dikunci.
 * Pesan berisi info waktu unlock dan kontak SuperAdmin dalam Bahasa Indonesia.
 *
 * Kalau FONNTE_API_KEY tidak ada → skip pengiriman, return { success: false }.
 * Kalau pengiriman gagal → log error, return { success: false, reason }.
 *
 * @param data.nomor_wa           - Nomor WA tujuan (format: 628xxxxxxxx)
 * @param data.nama               - Nama user untuk sapaan
 * @param data.lock_until         - Waktu akun terbuka kembali (Date object)
 * @param data.max_login_attempts - Jumlah percobaan gagal dari policy
 * @param data.superadmin_email   - Email SuperAdmin untuk kontak darurat
 */
export async function sendLockNotificationWA(data: {
  nomor_wa:           string
  nama:               string
  lock_until:         Date
  max_login_attempts: number
  superadmin_email:   string
}): Promise<{ success: boolean; reason?: string }> {
  // Validasi API key sebelum kirim — kalau tidak ada, skip dengan warning
  const apiKey = process.env.FONNTE_API_KEY
  if (!apiKey) {
    console.warn('[account-lock] FONNTE_API_KEY tidak ada — notifikasi WA dikunci dilewati')
    return { success: false, reason: 'FONNTE_API_KEY tidak ada' }
  }

  // Format waktu unlock ke WIB (UTC+7) dalam format jam:menit
  const lockUntilWIB = data.lock_until.toLocaleTimeString('id-ID', {
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'Asia/Jakarta',
    hour12:   false,
  })

  // Susun isi pesan WA dalam Bahasa Indonesia
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
