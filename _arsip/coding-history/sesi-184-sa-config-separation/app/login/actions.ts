// app/login/actions.ts
// Server Actions login — Unified action untuk semua role.
//
// OPTIMASI Sesi #075 — Custom Access Token Hook + eliminasi DB query
// OPTIMASI Sesi #076 — Cold start improvement + FIX T-048
// SPLIT Sesi #074 — actions.ts + actions-legacy.ts + login-session-check.ts
// FIX S#183a — tambah field `role` ke LoginActionResult
// FIX S#183d — SA OTP=required: TIDAK set session cookie + TIDAK fire tasks
// FIX S#183e — SA OTP=required: set `otp_pending` cookie → middleware Guard 5 blokir akses dashboard
//   Tanpa ini: Supabase JWT masih valid → middleware izinkan masuk via getClaims()/getUser()
//   Dengan ini: middleware cek otp_pending dulu → redirect /login jika cookie ada
//   selesaiLogin() menghapus otp_pending setelah OTP diverifikasi
// PENTING: buatSupabaseSSR() → 1x cookies() → tidak ada regresi double-cookies +700ms

'use server'

import { createServerSupabaseClient }          from '@/lib/supabase-server'
import { getAccountLock }                       from '@/lib/services/account-lock.service'
import { getConfigValues, parseConfigNumber }   from '@/lib/config-registry'
import { ROLES, ACCOUNT_LOCK_STATUS }           from '@/lib/constants'
import { SESSION_DEFAULT_TIMEOUT_MINUTES }       from '@/lib/auth'
import { parseRequireOtpForRole }               from '@/app/login/login-types'
import {
  decodeAppClaims, formatLockUntilWIB, hitungTujuanRedirectServer,
  setCookiesLoginServer, jalankanAfterTasksLogin,
  buildLoginFormSchema, buatSupabaseSSR, prosesGagalLogin,
} from './login-action-helpers'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface LoginActionParams {
  email:       string
  password:    string
  device:      string
  gpsKota:     string
  redirectTo?: string
}

export interface LoginActionResult {
  ok:           boolean
  errorKey?:    string
  errorVars?:   Record<string, string>
  redirectTo?:  string
  nama?:        string
  uid?:         string
  tenantId?:    string
  nomorWa?:     string
  role?:        string
}

// ─── Helper: cek lock sebelum proses ─────────────────────────────────────────
async function cekLockAwal(email: string): Promise<
  { locked: true;  result: LoginActionResult } |
  { locked: false; hadAttempts: boolean }
> {
  const lockDoc = await getAccountLock(email)
  if (lockDoc?.status === ACCOUNT_LOCK_STATUS.LOCKED && lockDoc.lock_until) {
    if (new Date(lockDoc.lock_until).getTime() > Date.now()) {
      const lock_until_wib = await formatLockUntilWIB(lockDoc.lock_until)
      return { locked: true, result: { ok: false, errorKey: 'login_error_akun_dikunci', errorVars: { lock_until_wib } } }
    }
  }
  return { locked: false, hadAttempts: (lockDoc?.count ?? 0) > 0 }
}

// ═════════════════════════════════════════════════════════════════════════════
// loginUnifiedAction
// ═════════════════════════════════════════════════════════════════════════════

export async function loginUnifiedAction(params: LoginActionParams): Promise<LoginActionResult> {
  const { email, password, device, gpsKota, redirectTo } = params

  const { supabase, cookieStore } = await buatSupabaseSSR()

  const [lock, authResult, sessionCfg] = await Promise.all([
    cekLockAwal(email),
    supabase.auth.signInWithPassword({ email, password }),
    getConfigValues('security_login'),
  ])

  const sessionTimeoutMinutes = parseConfigNumber(sessionCfg['session_timeout_minutes'], SESSION_DEFAULT_TIMEOUT_MINUTES)
  const passwordMinLength     = parseConfigNumber(sessionCfg['password_min_length'], 8)

  if (!buildLoginFormSchema(passwordMinLength).safeParse({ email, password }).success)
    return { ok: false, errorKey: 'login_error_umum' }

  if (lock.locked) {
    if (!authResult.error && authResult.data?.session) {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
    }
    return lock.result
  }

  const authData  = authResult.data
  const authError = authResult.error

  if (authError || !authData?.session || !authData?.user) {
    const adminDb = createServerSupabaseClient()
    const { data: userRow } = await adminDb
      .from('users').select('tenant_id').eq('email', email).maybeSingle()
    return prosesGagalLogin(email, userRow?.tenant_id ?? null, authError?.message ?? '')
  }

  const claims    = decodeAppClaims(authData.session.access_token)
  const { role, tenantId: claimTenantId } = claims
  const uid       = authData.user.id
  const sessionId = crypto.randomUUID()

  // ── SUPERADMIN ────────────────────────────────────────────────────────────
  if (role === ROLES.SUPERADMIN) {
    const nama          = claims.nama
    const requireOtpRaw = sessionCfg['require_otp'] ?? 'required'
    const otpModeSA     = parseRequireOtpForRole(requireOtpRaw, 'super_admin')

    if (otpModeSA === 'required') {
      cookieStore.set('otp_pending', '1', {
        httpOnly: false,
        path: '/',
        maxAge: 600,
        sameSite: 'strict',
      })
      return { ok: true, nama, uid, role: ROLES.SUPERADMIN }
    }

    await setCookiesLoginServer({ role: ROLES.SUPERADMIN, tenantId: '', gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin(
      { uid, tenantId: null, nama, role: ROLES.SUPERADMIN, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.SUPERADMIN, redirectTo), nama, uid, role: ROLES.SUPERADMIN }
  }

  if (!claimTenantId) {
    try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
    return { ok: false, errorKey: 'login_error_config_belum_lengkap' }
  }

  if (role === ROLES.VENDOR) {
    const nama = claims.nama
    if (claims.vendorStatus !== undefined && claims.nomorWa !== undefined) {
      if (claims.vendorStatus.toUpperCase() !== 'APPROVED') {
        try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
        return { ok: false, errorKey: 'login_error_akun_belum_aktif' }
      }
      await setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
      jalankanAfterTasksLogin(
        { uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email },
        sessionId
      )
      return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa: claims.nomorWa, role: ROLES.VENDOR }
    }
    const adminDb = createServerSupabaseClient()
    const [profileResult] = await Promise.all([
      adminDb.from('user_profiles').select('status, nomor_wa').eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle(),
      setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore),
    ])
    const profileRow = profileResult.data
    if ((profileRow?.status ?? '').toUpperCase() !== 'APPROVED') {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
      return { ok: false, errorKey: 'login_error_akun_belum_aktif' }
    }
    const nomorWa = profileRow?.nomor_wa ?? ''
    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa, role: ROLES.VENDOR }
  }

  if (role === ROLES.ADMIN_TENANT) {
    const nama = claims.nama
    await setCookiesLoginServer({ role: ROLES.ADMIN_TENANT, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.ADMIN_TENANT, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.ADMIN_TENANT, redirectTo), nama, uid, tenantId: claimTenantId, role: ROLES.ADMIN_TENANT }
  }

  if (role === ROLES.CUSTOMER) {
    const nama = claims.nama
    await setCookiesLoginServer({ role: ROLES.CUSTOMER, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.CUSTOMER, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.CUSTOMER, redirectTo), nama, uid, tenantId: claimTenantId, role: ROLES.CUSTOMER }
  }

  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
  return { ok: false, errorKey: 'login_error_role_tidak_ditemukan' }
}
