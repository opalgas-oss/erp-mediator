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
  nama:          string
  vendorStatus?: string
  nomorWa?:      string
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

export const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'login_error_credentials_salah',
  'Email not confirmed':       'login_error_email_belum_konfirmasi',
  'Too many requests':         'login_error_terlalu_banyak_percobaan',
  'Network request failed':    'login_error_koneksi_gagal',
  'User not found':            'login_error_credentials_salah',
}

export function decodeAppClaims(token: string): AppClaims {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { role: '', tenantId: '', nama: '' }
    const padded   = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload  = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>
    const appMeta  = (typeof payload['app_metadata']  === 'object' && payload['app_metadata']  !== null)
                   ? payload['app_metadata']  as Record<string, unknown> : {}
    const userMeta = (typeof payload['user_metadata'] === 'object' && payload['user_metadata'] !== null)
                   ? payload['user_metadata'] as Record<string, unknown> : {}
    return {
      role:         typeof payload['app_role']         === 'string' ? payload['app_role']
                  : typeof appMeta['app_role']          === 'string' ? appMeta['app_role']         : '',
      tenantId:     typeof payload['tenant_id']        === 'string' ? payload['tenant_id']
                  : typeof appMeta['tenant_id']         === 'string' ? appMeta['tenant_id']        : '',
      nama:         typeof payload['nama']              === 'string' ? payload['nama']
                  : typeof appMeta['nama']              === 'string' ? appMeta['nama']
                  : typeof userMeta['nama']             === 'string' ? userMeta['nama']             : '',
      vendorStatus: typeof payload['vendor_status']    === 'string' ? payload['vendor_status']     : undefined,
      nomorWa:      typeof payload['nomor_wa']         === 'string' ? payload['nomor_wa']          : undefined,
    }
  } catch {
    return { role: '', tenantId: '', nama: '' }
  }
}

export function mapSupabaseErrorKey(msg: string): string {
  const match = Object.entries(SUPABASE_ERROR_MAP).find(
    ([k]) => msg.toLowerCase().includes(k.toLowerCase())
  )
  return match?.[1] ?? 'login_error_umum'
}

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

// ─── E. setCookiesLoginServer — PRE-S#165 (4 cookies, MISSING session_timeout_minutes) ───
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
  cookieStore.set('session_role',     params.role,                          { path: '/', maxAge, sameSite: 'strict' })
  cookieStore.set('session_tenant',   params.tenantId ?? '',                { path: '/', maxAge, sameSite: 'strict' })
  cookieStore.set('gps_kota',         params.gpsKota || 'Tidak Diketahui', { path: '/', maxAge })
  cookieStore.set('session_login_at', loginAt,                              { path: '/', maxAge })
  // BUG T-041: 'session_timeout_minutes' cookie tidak di-set di sini
  // → middleware.ts timeoutMenit selalu null → inactive timeout tidak pernah dieksekusi
}

export function jalankanAfterTasksLogin(params: AfterTasksParams, sessionId: string): void {
  after(async () => {
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
  })
}

export function buildLoginFormSchema(passwordMinLength = 8) {
  return z.object({
    email:    z.string().email('Format email tidak valid'),
    password: z.string().min(passwordMinLength, `Password minimal ${passwordMinLength} karakter`),
    device:   z.string().optional(),
    gpsKota:  z.string().optional(),
  })
}

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

export async function prosesGagalLogin(
  email:    string,
  tenantId: string | null,
  authMsg:  string,
): Promise<GagalLoginResult> {
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

export async function ambilNamaUser(uid: string): Promise<string> {
  try {
    const adminDb = createServerSupabaseClient()
    const { data } = await adminDb.from('users').select('nama').eq('id', uid).maybeSingle()
    return data?.nama ?? ''
  } catch { return '' }
}
