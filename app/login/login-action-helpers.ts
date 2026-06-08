// app/login/login-action-helpers.ts
// Shared helper functions untuk semua login server actions.
//
// ATURAN: File ini TIDAK boleh pakai 'use client' atau 'use server'.
//         Dipanggil dari dalam server action — berjalan di server context.
//
// BERISI:
//   A. decodeAppClaims()            — decode JWT access token → role + tenantId
//   B. mapSupabaseErrorKey()        — map error Supabase → key message_library
//   C. formatLockUntilWIB()         — format ISO timestamp → "HH.mm WIB"
//   D. hitungTujuanRedirectServer() — URL dashboard sesuai role
//   E. setCookiesLoginServer()      — set 4 session cookies (terima cookieStore dari luar)
//   F. jalankanAfterTasksLogin()    — 3 background tasks via after()
//   G. buildLoginFormSchema()       — Zod schema validasi input login
//   H. buatSupabaseSSR()            — buat Supabase SSR client + return cookieStore
//   I. prosesGagalLogin()           — increment lock + kirim WA notif + return error key
//   J. ambilNamaUser()              — query nama user dari tabel users (SA only)
//
// FIX REGRESI Sesi #060:
//   cookies() hanya boleh dipanggil SEKALI per request — di buatSupabaseSSR().
//
// FIX BUG-011 Sesi #063:
//   prosesGagalLogin() sebelumnya hanya query tabel users → Vendor/AdminTenant/Customer tidak ditemukan.
//   Fix: pakai findByEmail() dari user.repository yang cek 3 tabel (users → user_profiles → auth).
//   Fix: pass nomor_wa aktual dari hasil lookup (bukan '' hardcoded kosong).
//   Fix: panggil sendLockNotificationWA() saat akun baru dikunci.
//   WA notif dikirim ke nomor_wa USER SENDIRI (bukan hanya SuperAdmin).
//   Template pesan sudah berisi: "Jika bukan Anda, hubungi SuperAdmin: {superadmin_email}".

import { cookies }                from 'next/headers'
import { after }                  from 'next/server'
import { z }                      from 'zod'
import { createServerClient }     from '@supabase/ssr'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { createServerSupabaseClient }  from '@/lib/supabase-server'
import { create as createSessionLog }  from '@/lib/repositories/session-log.repository'
import { updateUserPresence }          from '@/lib/services/activity.service'
import {
  unlockAccount,
  incrementLockCount,
  sendLockNotificationWA,
} from '@/lib/services/account-lock.service'
import {
  findByEmail as findUserByEmail,
  findSuperAdminEmail,
} from '@/lib/repositories/user.repository'
import { getPlatformTimezone, getConfigValues, parseConfigNumber } from '@/lib/config-registry'
import { ROLES, UNLOCK_METHOD } from '@/lib/constants'
import { SESSION_DEFAULT_TIMEOUT_MINUTES } from '@/lib/auth'

// ─── Tipe Shared ─────────────────────────────────────────────────────────────

export interface AppClaims {
  role:          string
  tenantId:      string
  // BARU Sesi #075 — tersedia setelah Custom Access Token Hook aktif
  // (atau dari user_metadata sebelum hook — nama sudah ada di JWT dari awal)
  nama:          string
  vendorStatus?: string   // APPROVED/PENDING/dll — dari hook, untuk skip DB query saat login Vendor
  nomorWa?:      string   // nomor WhatsApp — dari hook, untuk skip DB query OTP Vendor
}

export interface SetCookiesParams {
  role:                   string
  tenantId:               string
  gpsKota:                string
  sessionTimeoutMinutes?: number
}

export interface AfterTasksParams {
  uid:         string
  tenantId:    string | null
  nama:        string
  role:        string
  device:      string
  gpsKota:     string
  hadAttempts: boolean
  email:       string
}

export interface GagalLoginResult {
  ok:         false
  errorKey:   string
  errorVars?: Record<string, string>
}

export interface SupabaseSSRResult {
  supabase:    ReturnType<typeof createServerClient>
  cookieStore: ReadonlyRequestCookies
}

// ─── MAP error Supabase → key message_library ─────────────────────────────────
export const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'login_error_credentials_salah',
  'Email not confirmed':       'login_error_email_belum_konfirmasi',
  'Too many requests':         'login_error_terlalu_banyak_percobaan',
  'Network request failed':    'login_error_koneksi_gagal',
  'User not found':            'login_error_credentials_salah',
}

// ─── A. decodeAppClaims ───────────────────────────────────────────────────────
/**
 * Decode JWT access token → AppClaims.
 *
 * STRUKTUR JWT dari inject-custom-claims Edge Function v8 (AUTH Normalized):
 *   payload['is_super_admin'] — true jika SuperAdmin (deteksi SA, bukan app_role)
 *   payload['memberships']    — array [{tenant_id, role, status}] untuk non-SA
 *   payload['nama']           — nama user
 *   payload['vendor_status']  — register_status dari user_profiles (untuk Vendor)
 *   payload['nomor_wa']       — nomor WhatsApp (untuk OTP non-SA)
 *
 * DIHAPUS dari JWT (model flat DEPRECATED sejak v8 — KEPUTUSAN_AUTH_NORMALIZED_v1.md):
 *   app_role, tenant_id, is_platform_owner
 *
 * FIX CASE SESI-13 (8 Juni 2026): baca is_super_admin + memberships[] (v8)
 *   Sebelumnya baca app_role flat → selalu '' karena v8 tidak inject app_role
 *   → SA login gagal "Konfigurasi akun belum lengkap"
 */
export function decodeAppClaims(token: string): AppClaims {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { role: '', tenantId: '', nama: '' }
    const padded   = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload  = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>

    // Nested objects sebagai fallback nama
    const appMeta  = (typeof payload['app_metadata']  === 'object' && payload['app_metadata']  !== null)
                   ? payload['app_metadata']  as Record<string, unknown> : {}
    const userMeta = (typeof payload['user_metadata'] === 'object' && payload['user_metadata'] !== null)
                   ? payload['user_metadata'] as Record<string, unknown> : {}

    // NORMALIZED v8: is_super_admin flag + memberships[]
    const isSuperAdmin = payload['is_super_admin'] === true

    // Memberships dari JWT (model normalized)
    interface JwtMembership { tenant_id: string | null; role: string; status: string }
    const rawMemberships = payload['memberships']
    const memberships: JwtMembership[] = Array.isArray(rawMemberships) ? rawMemberships as JwtMembership[] : []

    // Tentukan role + tenantId
    let role     = ''
    let tenantId = ''
    if (isSuperAdmin) {
      // SA tidak ada di memberships — deteksi via flag
      role     = 'super_admin'
      tenantId = ''
    } else if (memberships.length > 0) {
      // Non-SA: ambil dari memberships[0] (role utama)
      const first = memberships[0]
      role     = typeof first.role      === 'string' ? first.role      : ''
      tenantId = typeof first.tenant_id === 'string' ? first.tenant_id : ''
    }

    return {
      role,
      tenantId,
      // nama: dari top level (v8) atau fallback metadata
      nama:         typeof payload['nama']           === 'string' ? payload['nama']
                  : typeof appMeta['nama']           === 'string' ? appMeta['nama']
                  : typeof userMeta['nama']          === 'string' ? userMeta['nama']          : '',
      // vendor_status: dari JWT (diinjeksi v8 dari register_status)
      vendorStatus: typeof payload['vendor_status'] === 'string' ? payload['vendor_status']  : undefined,
      // nomor_wa: dari JWT (diinjeksi v8 untuk flow OTP)
      nomorWa:      typeof payload['nomor_wa']      === 'string' ? payload['nomor_wa']       : undefined,
    }
  } catch {
    return { role: '', tenantId: '', nama: '' }
  }
}

// ─── B. mapSupabaseErrorKey ───────────────────────────────────────────────────
export function mapSupabaseErrorKey(msg: string): string {
  const match = Object.entries(SUPABASE_ERROR_MAP).find(
    ([k]) => msg.toLowerCase().includes(k.toLowerCase())
  )
  return match?.[1] ?? 'login_error_umum'
}

// ─── C. formatLockUntilWIB ────────────────────────────────────────────────────
export async function formatLockUntilWIB(lockUntilISO: string): Promise<string> {
  try {
    const timezone = await getPlatformTimezone()
    const formatted = new Date(lockUntilISO).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
    })
    return `${formatted.replace(':', '.')} WIB`
  } catch {
    return lockUntilISO
  }
}

// ─── D. hitungTujuanRedirectServer ────────────────────────────────────────────
export function hitungTujuanRedirectServer(role: string, redirectTo?: string): string {
  if (redirectTo && redirectTo.startsWith('/')) return redirectTo
  const ROLE_DASHBOARD: Record<string, string> = {
    [ROLES.SUPERADMIN]:   '/dashboard/superadmin',
    [ROLES.VENDOR]:       '/dashboard/vendor',
    [ROLES.ADMIN_TENANT]: '/dashboard/admin',
    [ROLES.CUSTOMER]:     '/dashboard/customer',
  }
  return ROLE_DASHBOARD[role] ?? '/dashboard'
}

// ─── E. setCookiesLoginServer ─────────────────────────────────────────────────
/**
 * Set 5 session cookies via cookieStore yang diterima dari buatSupabaseSSR().
 * TIDAK memanggil cookies() sendiri — mencegah double cookies() call per request.
 * FIX T-041 Sesi #165: tambah cookie 'session_timeout_minutes' agar middleware
 *   dapat membaca nilai timeout dan mengeksekusi cek inactive session timeout.
 * @param params      - SetCookiesParams
 * @param cookieStore - Instance dari buatSupabaseSSR().cookieStore
 */
export async function setCookiesLoginServer(
  params:      SetCookiesParams,
  cookieStore: ReadonlyRequestCookies,
): Promise<void> {
  let sessionTimeoutMinutes = params.sessionTimeoutMinutes ?? SESSION_DEFAULT_TIMEOUT_MINUTES
  if (!params.sessionTimeoutMinutes) {
    try {
      const cfg = await getConfigValues('security_login')
      sessionTimeoutMinutes = parseConfigNumber(cfg['session_timeout_minutes'], SESSION_DEFAULT_TIMEOUT_MINUTES)
    } catch { /* pakai default */ }
  }
  const maxAge  = sessionTimeoutMinutes * 60
  const loginAt = new Date().toISOString()
  cookieStore.set('session_role',            params.role,                          { path: '/', maxAge, sameSite: 'strict' })
  cookieStore.set('session_tenant',          params.tenantId ?? '',                { path: '/', maxAge, sameSite: 'strict' })
  cookieStore.set('gps_kota',                params.gpsKota || 'Tidak Diketahui', { path: '/', maxAge })
  cookieStore.set('session_login_at',        loginAt,                              { path: '/', maxAge })
  cookieStore.set('session_timeout_minutes', String(sessionTimeoutMinutes),        { path: '/', maxAge, sameSite: 'strict', httpOnly: true })
  // Cookie ke-5 'session_timeout_minutes' dibaca oleh middleware.ts untuk
  // menentukan durasi inactive timeout. Tanpa cookie ini, timeoutMenit = null
  // dan seluruh blok cek timeout tidak pernah dieksekusi (bug T-041).
}

// ─── F. jalankanAfterTasksLogin ───────────────────────────────────────────────
export function jalankanAfterTasksLogin(params: AfterTasksParams, sessionId: string): void {
  after(async () => {
    const t_after = performance.now() // [S190] timing — ukur apakah after() benar non-blocking
    try {
      await createSessionLog({
        uid: params.uid, tenantId: params.tenantId, role: params.role,
        device: params.device || 'Unknown', gpsKota: params.gpsKota || 'Tidak Diketahui', sessionId,
      })
    } catch (err) { console.error('[afterTasks] session-log gagal:', err) }

    try {
      await updateUserPresence({
        uid: params.uid, tenantId: params.tenantId, nama: params.nama, role: params.role,
        device: params.device || 'Unknown', currentPage: '/login', currentPageLabel: 'Halaman Login',
      })
    } catch (err) { console.error('[afterTasks] presence gagal:', err) }

    if (params.hadAttempts) {
      try {
        await unlockAccount({ uid: params.uid, email: params.email, method: UNLOCK_METHOD.AUTO })
      } catch (err) { console.error('[afterTasks] unlockAccount gagal:', err) }
    }
    console.log(`[S190] after-tasks-total: ${(performance.now() - t_after).toFixed(1)}ms`)
  })
}

// ─── G. buildLoginFormSchema ──────────────────────────────────────────────────
export function buildLoginFormSchema(passwordMinLength = 8) {
  return z.object({
    email:    z.string().email('Format email tidak valid'),
    password: z.string().min(passwordMinLength, `Password minimal ${passwordMinLength} karakter`),
    device:   z.string().optional(),
    gpsKota:  z.string().optional(),
  })
}

// ─── H. buatSupabaseSSR ───────────────────────────────────────────────────────
/**
 * Buat Supabase SSR client + return cookieStore.
 * cookies() hanya dipanggil SEKALI di sini — cookieStore di-share ke setCookiesLoginServer().
 * @returns { supabase, cookieStore }
 */
export async function buatSupabaseSSR(): Promise<SupabaseSSRResult> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
  return { supabase, cookieStore }
}

// ─── I. prosesGagalLogin ──────────────────────────────────────────────────────
/**
 * Proses login gagal: increment lock counter + kirim WA notif ke user jika terkunci.
 * FIX BUG-011 Sesi #063:
 *   - Pakai findByEmail() yang cek 3 tabel: users → user_profiles → auth
 *   - Pass nomor_wa aktual dari lookup (bukan hardcoded kosong)
 *   - Panggil sendLockNotificationWA() ke nomor_wa USER SENDIRI saat dikunci
 * @param email    - Email yang gagal login
 * @param tenantId - Tenant ID (dari JWT atau dari lookup)
 * @param authMsg  - Pesan error dari Supabase Auth
 */
export async function prosesGagalLogin(
  email:    string,
  tenantId: string | null,
  authMsg:  string,
): Promise<GagalLoginResult> {
  // Lookup user via 3 tabel: users (SA) → user_profiles (Vendor/AT/Customer) → auth
  const user = await findUserByEmail(email)

  if (user) {
    try {
      const incResult = await incrementLockCount({
        uid:      user.uid,
        email,
        nama:     user.nama,
        nomor_wa: user.nomor_wa,
        tenantId: tenantId ?? user.tenant_id,
      })

      // Akun baru saja dikunci — kirim WA notif ke nomor user yang bersangkutan
      if (incResult.locked && incResult.lock_until) {
        if (user.nomor_wa) {
          try {
            const superadminEmail = await findSuperAdminEmail() ?? ''
            const cfg             = await getConfigValues('security_login')
            const maxAttempts     = parseConfigNumber(cfg['max_login_attempts'], 5)
            await sendLockNotificationWA({
              nomor_wa:           user.nomor_wa,
              nama:               user.nama,
              lock_until:         new Date(incResult.lock_until),
              max_login_attempts: maxAttempts,
              superadmin_email:   superadminEmail,
              tenantId:           tenantId ?? user.tenant_id,
            })
          } catch (err) {
            console.error('[prosesGagalLogin] sendLockNotificationWA gagal:', err)
          }
        }
        const lock_until_wib = await formatLockUntilWIB(incResult.lock_until)
        return { ok: false, errorKey: 'login_error_akun_dikunci', errorVars: { lock_until_wib } }
      }
    } catch (err) {
      console.error('[prosesGagalLogin] incrementLockCount gagal:', err)
    }
  }

  return { ok: false, errorKey: mapSupabaseErrorKey(authMsg) }
}

// ─── J. ambilNamaUser ─────────────────────────────────────────────────────────
/**
 * Ambil nama SuperAdmin dari tabel users berdasarkan uid.
 * Khusus SA — dipanggil setelah loginSuperadminAction berhasil.
 * @param uid - UID SuperAdmin dari JWT
 * @returns Nama SA, string kosong jika tidak ditemukan
 */
export async function ambilNamaUser(uid: string): Promise<string> {
  try {
    const adminDb = createServerSupabaseClient()
    const { data } = await adminDb.from('users').select('nama').eq('id', uid).maybeSingle()
    return data?.nama ?? ''
  } catch { return '' }
}
