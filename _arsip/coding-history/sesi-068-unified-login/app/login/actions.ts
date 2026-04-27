// app/login/actions.ts
// Server Actions login — SuperAdmin, Vendor, AdminTenant.
//
// PENTING: buatSupabaseSSR() memanggil cookies() SEKALI → return { supabase, cookieStore }.
// cookieStore di-pass ke setCookiesLoginServer() — tidak ada double cookies() call.
// Double cookies() = regresi +700ms (ditemukan Sesi #060).
//
// FIX Sesi #061:
//   BUG-010 — loginVendorAction query user_profiles pakai .eq('uid') padahal kolom namanya 'id'.
//   Akibat: profileRow selalu null → semua Vendor APPROVED diblokir dengan 'belum diaktifkan'.
//   Fix: ganti .eq('uid', uid) → .eq('id', uid). Tambah nomor_wa ke select.
//   Tambah tenantId + nomorWa ke LoginActionResult agar useLoginFlow tidak perlu
//   fetchLoadUserProfile(uid, null) yang salah (null = dianggap SuperAdmin oleh route).

'use server'

import { createServerSupabaseClient }  from '@/lib/supabase-server'
import { getAccountLock }              from '@/lib/services/account-lock.service'
import { ROLES, ACCOUNT_LOCK_STATUS }  from '@/lib/constants'
import {
  decodeAppClaims, formatLockUntilWIB, hitungTujuanRedirectServer,
  setCookiesLoginServer, jalankanAfterTasksLogin, ambilNamaUser,
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
  ok:          boolean
  errorKey?:   string
  errorVars?:  Record<string, string>
  redirectTo?: string
  nama?:       string
  uid?:        string
  tenantId?:   string
  nomorWa?:    string
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
// loginSuperadminAction
// ═════════════════════════════════════════════════════════════════════════════

export async function loginSuperadminAction(params: LoginActionParams): Promise<LoginActionResult> {
  const { email, password, device, gpsKota, redirectTo } = params

  if (!buildLoginFormSchema().safeParse({ email, password }).success)
    return { ok: false, errorKey: 'login_error_umum' }

  const lock = await cekLockAwal(email)
  if (lock.locked) return lock.result

  const { supabase, cookieStore } = await buatSupabaseSSR()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData?.session || !authData?.user)
    return prosesGagalLogin(email, null, authError?.message ?? '')

  const claims = decodeAppClaims(authData.session.access_token)
  if (claims.role !== ROLES.SUPERADMIN) {
    try { await supabase.auth.signOut() } catch { /* abaikan */ }
    return { ok: false, errorKey: 'NOT_SUPERADMIN' }
  }

  const uid  = authData.user.id
  const nama = await ambilNamaUser(uid)
  await setCookiesLoginServer({ role: ROLES.SUPERADMIN, tenantId: '', gpsKota }, cookieStore)
  jalankanAfterTasksLogin(
    { uid, tenantId: null, nama, role: ROLES.SUPERADMIN, device, gpsKota, hadAttempts: lock.hadAttempts, email },
    crypto.randomUUID()
  )
  return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.SUPERADMIN, redirectTo), nama, uid }
}

// ═════════════════════════════════════════════════════════════════════════════
// loginVendorAction
// ═════════════════════════════════════════════════════════════════════════════

export async function loginVendorAction(params: LoginActionParams): Promise<LoginActionResult> {
  const { email, password, device, gpsKota, redirectTo } = params

  if (!buildLoginFormSchema().safeParse({ email, password }).success)
    return { ok: false, errorKey: 'login_error_umum' }

  const lock = await cekLockAwal(email)
  if (lock.locked) return lock.result

  const { supabase, cookieStore } = await buatSupabaseSSR()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData?.session || !authData?.user) {
    const adminDb = createServerSupabaseClient()
    const { data: userRow } = await adminDb.from('users').select('tenant_id').eq('email', email).maybeSingle()
    return prosesGagalLogin(email, userRow?.tenant_id ?? null, authError?.message ?? '')
  }

  const claims = decodeAppClaims(authData.session.access_token)
  if (claims.role !== ROLES.VENDOR) {
    try { await supabase.auth.signOut() } catch { /* abaikan */ }
    return { ok: false, errorKey: 'NOT_VENDOR' }
  }
  if (!claims.tenantId) {
    try { await supabase.auth.signOut() } catch { /* abaikan */ }
    return { ok: false, errorKey: 'login_error_config_belum_lengkap' }
  }

  const uid     = authData.user.id
  const adminDb = createServerSupabaseClient()
  const { data: profileRow } = await adminDb
    .from('user_profiles').select('status, nama, nomor_wa')
    .eq('id', uid).eq('tenant_id', claims.tenantId).maybeSingle()

  if ((profileRow?.status ?? '').toUpperCase() !== 'APPROVED') {
    try { await supabase.auth.signOut() } catch { /* abaikan */ }
    return { ok: false, errorKey: 'login_error_akun_belum_aktif' }
  }

  const nama    = profileRow?.nama    ?? (await ambilNamaUser(uid))
  const nomorWa = profileRow?.nomor_wa ?? ''
  await setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claims.tenantId, gpsKota }, cookieStore)
  jalankanAfterTasksLogin(
    { uid, tenantId: claims.tenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email },
    crypto.randomUUID()
  )
  return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claims.tenantId, nomorWa }
}

// ═════════════════════════════════════════════════════════════════════════════
// loginAdminTenantAction
// ═════════════════════════════════════════════════════════════════════════════

export async function loginAdminTenantAction(params: LoginActionParams): Promise<LoginActionResult> {
  const { email, password, device, gpsKota, redirectTo } = params

  if (!buildLoginFormSchema().safeParse({ email, password }).success)
    return { ok: false, errorKey: 'login_error_umum' }

  const lock = await cekLockAwal(email)
  if (lock.locked) return lock.result

  const { supabase, cookieStore } = await buatSupabaseSSR()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError || !authData?.session || !authData?.user) {
    const adminDb = createServerSupabaseClient()
    const { data: userRow } = await adminDb.from('users').select('tenant_id').eq('email', email).maybeSingle()
    return prosesGagalLogin(email, userRow?.tenant_id ?? null, authError?.message ?? '')
  }

  const claims = decodeAppClaims(authData.session.access_token)
  if (claims.role !== ROLES.ADMIN_TENANT) {
    try { await supabase.auth.signOut() } catch { /* abaikan */ }
    return { ok: false, errorKey: 'NOT_ADMIN_TENANT' }
  }
  if (!claims.tenantId) {
    try { await supabase.auth.signOut() } catch { /* abaikan */ }
    return { ok: false, errorKey: 'login_error_config_belum_lengkap' }
  }

  const uid  = authData.user.id
  const nama = await ambilNamaUser(uid)
  await setCookiesLoginServer({ role: ROLES.ADMIN_TENANT, tenantId: claims.tenantId, gpsKota }, cookieStore)
  jalankanAfterTasksLogin(
    { uid, tenantId: claims.tenantId, nama, role: ROLES.ADMIN_TENANT, device, gpsKota, hadAttempts: lock.hadAttempts, email },
    crypto.randomUUID()
  )
  return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.ADMIN_TENANT, redirectTo), nama, uid, tenantId: claims.tenantId }
}
