// app/login/actions.ts — ARSIP sebelum optimasi cold start Sesi #076
// (isi sama dengan versi aktif sebelum perubahan)
'use server'

import { createServerSupabaseClient }  from '@/lib/supabase-server'
import { getAccountLock }              from '@/lib/services/account-lock.service'
import { ROLES, ACCOUNT_LOCK_STATUS }  from '@/lib/constants'
import {
  decodeAppClaims, formatLockUntilWIB, hitungTujuanRedirectServer,
  setCookiesLoginServer, jalankanAfterTasksLogin,
  buildLoginFormSchema, buatSupabaseSSR, prosesGagalLogin,
} from './login-action-helpers'

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

  if (!buildLoginFormSchema().safeParse({ email, password }).success)
    return { ok: false, errorKey: 'login_error_umum' }

  const { supabase, cookieStore } = await buatSupabaseSSR()

  const [lock, authResult] = await Promise.all([
    cekLockAwal(email),
    supabase.auth.signInWithPassword({ email, password }),
  ])

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
    await setCookiesLoginServer({ role: ROLES.SUPERADMIN, tenantId: '', gpsKota }, cookieStore)
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
      await setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claimTenantId, gpsKota }, cookieStore)
      jalankanAfterTasksLogin({ uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
      return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa: claims.nomorWa }
    }
    const adminDb = createServerSupabaseClient()
    const [profileResult] = await Promise.all([
      adminDb.from('user_profiles').select('status, nomor_wa').eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle(),
      setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claimTenantId, gpsKota }, cookieStore),
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
    await setCookiesLoginServer({ role: ROLES.ADMIN_TENANT, tenantId: claimTenantId, gpsKota }, cookieStore)
    jalankanAfterTasksLogin({ uid, tenantId: claimTenantId, nama, role: ROLES.ADMIN_TENANT, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.ADMIN_TENANT, redirectTo), nama, uid, tenantId: claimTenantId }
  }

  if (role === ROLES.CUSTOMER) {
    const nama = claims.nama
    await setCookiesLoginServer({ role: ROLES.CUSTOMER, tenantId: claimTenantId, gpsKota }, cookieStore)
    jalankanAfterTasksLogin({ uid, tenantId: claimTenantId, nama, role: ROLES.CUSTOMER, device, gpsKota, hadAttempts: lock.hadAttempts, email }, sessionId)
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.CUSTOMER, redirectTo), nama, uid, tenantId: claimTenantId }
  }

  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
  return { ok: false, errorKey: 'login_error_role_tidak_ditemukan' }
}
