// ARSIP PRE-FIX S#183 — FIX-SA-ADMINTENANT-CUSTOMER-OTP
// Original: app/login/actions.ts
// Alasan arsip: Tambah field `role` ke LoginActionResult untuk fix OTP enforcement SA/AdminTenant/Customer
// app/login/actions.ts
// Server Actions login — Unified action untuk semua role.
//
// OPTIMASI Sesi #075 — Custom Access Token Hook + eliminasi DB query:
//   1. cekLockAwal() + signInWithPassword() PARALLEL (~80ms saving)
//   2. nama diambil dari JWT claims (user_metadata.nama selalu ada) — tidak perlu ambilNamaUser()
//   3. Vendor: progressive enhancement — jika hook aktif, vendorStatus+nomorWa dari JWT
//      (skip DB query sepenuhnya). Jika hook belum aktif, fallback ke DB query.
//
// OPTIMASI Sesi #076 — Cold start improvement:
//   4. FIX T-048 S#165: LOGIN_FORM_SCHEMA DIHAPUS dari module-level.
//      Sebelumnya: buildLoginFormSchema() dipanggil sekali saat module dimuat dengan default 8.
//      Sesudahnya: buildLoginFormSchema(passwordMinLength) per-request dari config_registry.
//      Password validation tetap dalam 1 round-trip berkat getConfigValues sudah di Promise.all.
//   5. getConfigValues('security_login') masuk ke Promise.all yang sudah ada — parallel dengan
//      cekLockAwal + signInWithPassword. Warm: 0ms saving (sudah cached). Cold: ~50-80ms saving.
//      sessionTimeoutMinutes + passwordMinLength keduanya diambil dari sessionCfg.
//
// SPLIT Sesi #074: dipecah dari 15.8 KB → actions.ts + actions-legacy.ts + login-session-check.ts
// FIX Sesi #074: tambah Customer handler.
// REFACTOR Sesi #068: 1 signInWithPassword untuk semua role.
// PENTING: buatSupabaseSSR() → 1x cookies() → tidak ada regresi double-cookies +700ms.

'use server'

import { createServerSupabaseClient }          from '@/lib/supabase-server'
import { getAccountLock }                       from '@/lib/services/account-lock.service'
import { getConfigValues, parseConfigNumber }   from '@/lib/config-registry'
import { ROLES, ACCOUNT_LOCK_STATUS }           from '@/lib/constants'
import { SESSION_DEFAULT_TIMEOUT_MINUTES }       from '@/lib/auth'
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
  if (role === ROLES.SUPERADMIN) {
    const nama = claims.nama
    await setCookiesLoginServer({ role: ROLES.SUPERADMIN, tenantId: '', gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin({ uid, tenantId: null, nama, role: ROLES.SUPERADMIN, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.SUPERADMIN, redirectTo), nama, uid }
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
      jalankanAfterTasksLogin({ uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
      return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa: claims.nomorWa }
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
    jalankanAfterTasksLogin({ uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa }
  }
  if (role === ROLES.ADMIN_TENANT) {
    const nama = claims.nama
    await setCookiesLoginServer({ role: ROLES.ADMIN_TENANT, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin({ uid, tenantId: claimTenantId, nama, role: ROLES.ADMIN_TENANT, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.ADMIN_TENANT, redirectTo), nama, uid, tenantId: claimTenantId }
  }
  if (role === ROLES.CUSTOMER) {
    const nama = claims.nama
    await setCookiesLoginServer({ role: ROLES.CUSTOMER, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin({ uid, tenantId: claimTenantId, nama, role: ROLES.CUSTOMER, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.CUSTOMER, redirectTo), nama, uid, tenantId: claimTenantId }
  }
  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
  return { ok: false, errorKey: 'login_error_role_tidak_ditemukan' }
}
