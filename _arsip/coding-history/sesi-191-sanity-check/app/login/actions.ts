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
// FIX S#185 — Vendor/AdminTenant/Customer OTP enforcement server-side
//   Sebelumnya: setCookiesLoginServer dipanggil SEBELUM OTP diverifikasi (security gap)
//   Sesudah: cek otpMode dulu → jika required, set otp_pending + return {uid,role,nomorWa} tanpa cookies
//   Vendor sub-path 2 juga difix: setCookies tidak lagi dalam Promise.all (bug security tersembunyi)
// PENTING: buatSupabaseSSR() → 1x cookies() → tidak ada regresi double-cookies +700ms

'use server'

import { createServerSupabaseClient }          from '@/lib/supabase-server'
import { getAccountLock }                       from '@/lib/services/account-lock.service'
import { getConfigValues, parseConfigNumber }   from '@/lib/config-registry'
import { ROLES, ACCOUNT_LOCK_STATUS }           from '@/lib/constants'
import { SESSION_DEFAULT_TIMEOUT_MINUTES }       from '@/lib/auth'
import { parseRequireOtpForRole, getRequireOtpConfigKey } from '@/app/login/login-types'
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

  // [S190] TIMING LOG — digunakan untuk audit performa BUG-021 Layer 2 Fase 1
  // AKAN DIHAPUS setelah data timing terkumpul
  const t_start = performance.now()
  const { supabase, cookieStore } = await buatSupabaseSSR()
  console.log(`[S190] buatSupabaseSSR: ${(performance.now() - t_start).toFixed(1)}ms`)

  const t_parallel = performance.now()
  const [lock, authResult, sessionCfg] = await Promise.all([
    cekLockAwal(email),
    supabase.auth.signInWithPassword({ email, password }),
    getConfigValues('security_login'),
  ])
  console.log(`[S190] Promise.all-block: ${(performance.now() - t_parallel).toFixed(1)}ms`)

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

  const t_decode = performance.now()
  const claims    = decodeAppClaims(authData.session.access_token)
  console.log(`[S190] decodeAppClaims: ${(performance.now() - t_decode).toFixed(1)}ms`)
  const { role, tenantId: claimTenantId } = claims
  const uid       = authData.user.id
  const sessionId = crypto.randomUUID()

  // ── SUPERADMIN ────────────────────────────────────────────────────────────
  if (role === ROLES.SUPERADMIN) {
    const nama          = claims.nama
    const requireOtpRaw = sessionCfg[getRequireOtpConfigKey('super_admin')] ?? 'required'
    const otpModeSA     = parseRequireOtpForRole(requireOtpRaw, 'super_admin')

    if (otpModeSA === 'required') {
      // FIX S#183d+183e — SA OTP=required:
      // TIDAK set session cookie (agar selesaiLogin menjadi satu-satunya yang set cookie)
      // Set otp_pending=1 → middleware Guard 5 akan redirect ke /login saat refresh
      // Supabase JWT masih valid (diperlukan untuk send-otp + verify-otp API)
      // selesaiLogin() akan hapus otp_pending + set session cookie setelah OTP diverifikasi
      cookieStore.set('otp_pending', '1', {
        httpOnly: false,  // harus bisa dihapus oleh document.cookie di selesaiLogin client
        path: '/',
        maxAge: 600,     // 10 menit — cukup untuk seluruh OTP flow
        sameSite: 'strict',
      })
      return { ok: true, nama, uid, role: ROLES.SUPERADMIN }
    }

    // OTP disabled → behavior lama: set session cookie + fire tasks + redirect langsung
    const t_cookie = performance.now()
    await setCookiesLoginServer({ role: ROLES.SUPERADMIN, tenantId: '', gpsKota, sessionTimeoutMinutes }, cookieStore)
    console.log(`[S190] setCookiesLoginServer: ${(performance.now() - t_cookie).toFixed(1)}ms`)
    jalankanAfterTasksLogin(
      { uid, tenantId: null, nama, role: ROLES.SUPERADMIN, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    console.log(`[S190] total-action: ${(performance.now() - t_start).toFixed(1)}ms`)
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.SUPERADMIN, redirectTo), nama, uid, role: ROLES.SUPERADMIN }
  }

  // ── Semua role non-SA wajib punya tenantId di JWT ─────────────────────────
  if (!claimTenantId) {
    try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
    return { ok: false, errorKey: 'login_error_config_belum_lengkap' }
  }

  // ── VENDOR ────────────────────────────────────────────────────────────────
  if (role === ROLES.VENDOR) {
    const nama = claims.nama

    if (claims.vendorStatus !== undefined && claims.nomorWa !== undefined) {
      if (claims.vendorStatus.toUpperCase() !== 'APPROVED') {
        try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
        return { ok: false, errorKey: 'login_error_akun_belum_aktif' }
      }
      // FIX S#185 — Vendor OTP enforcement server-side (sama dengan pola SA S#183d+183e)
      // Sebelumnya: setCookies dulu → cookie terset sebelum OTP diverifikasi
      // Sesudah: cek otpMode dulu → jika required, set otp_pending + return tanpa cookies
      const otpModeVendor1 = parseRequireOtpForRole(
        sessionCfg[getRequireOtpConfigKey(ROLES.VENDOR)] ?? 'required', ROLES.VENDOR
      )
      if (otpModeVendor1 === 'required') {
        cookieStore.set('otp_pending', '1', {
          httpOnly: false, path: '/', maxAge: 600, sameSite: 'strict',
        })
        return { ok: true, nama, uid, tenantId: claimTenantId, nomorWa: claims.nomorWa, role: ROLES.VENDOR }
      }
      await setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
      jalankanAfterTasksLogin(
        { uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email },
        sessionId
      )
      return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa: claims.nomorWa, role: ROLES.VENDOR }
    }

    const adminDb = createServerSupabaseClient()
    // FIX S#185 — Bug security: sebelumnya setCookiesLoginServer dipanggil dalam Promise.all
    // bersamaan fetch profile → cookie terset SEBELUM vendor status di-cek.
    // Fix: fetch dulu, cek status, baru setCookies jika diizinkan.
    const { data: profileRow } = await adminDb.from('user_profiles')
      .select('status, nomor_wa')
      .eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle()
    if ((profileRow?.status ?? '').toUpperCase() !== 'APPROVED') {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
      return { ok: false, errorKey: 'login_error_akun_belum_aktif' }
    }
    const nomorWa = profileRow?.nomor_wa ?? ''
    // FIX S#185 — Vendor OTP enforcement server-side
    const otpModeVendor2 = parseRequireOtpForRole(
      sessionCfg[getRequireOtpConfigKey(ROLES.VENDOR)] ?? 'required', ROLES.VENDOR
    )
    if (otpModeVendor2 === 'required') {
      cookieStore.set('otp_pending', '1', {
        httpOnly: false, path: '/', maxAge: 600, sameSite: 'strict',
      })
      return { ok: true, nama, uid, tenantId: claimTenantId, nomorWa, role: ROLES.VENDOR }
    }
    await setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa, role: ROLES.VENDOR }
  }

  // ── ADMIN TENANT ──────────────────────────────────────────────────────────
  if (role === ROLES.ADMIN_TENANT) {
    const nama = claims.nama
    // FIX S#185 — AdminTenant OTP enforcement server-side
    // Fetch nomor_wa untuk dikirim ke client jika OTP=required (lazy: hanya jika OTP diperlukan)
    const otpModeAT = parseRequireOtpForRole(
      sessionCfg[getRequireOtpConfigKey(ROLES.ADMIN_TENANT)] ?? 'required', ROLES.ADMIN_TENANT
    )
    if (otpModeAT === 'required') {
      const adminDbAT = createServerSupabaseClient()
      const { data: atProfile } = await adminDbAT.from('user_profiles')
        .select('nomor_wa').eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle()
      cookieStore.set('otp_pending', '1', {
        httpOnly: false, path: '/', maxAge: 600, sameSite: 'strict',
      })
      return { ok: true, nama, uid, tenantId: claimTenantId, nomorWa: atProfile?.nomor_wa ?? '', role: ROLES.ADMIN_TENANT }
    }
    await setCookiesLoginServer({ role: ROLES.ADMIN_TENANT, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.ADMIN_TENANT, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.ADMIN_TENANT, redirectTo), nama, uid, tenantId: claimTenantId, role: ROLES.ADMIN_TENANT }
  }

  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  if (role === ROLES.CUSTOMER) {
    const nama = claims.nama
    // FIX S#185 — Customer OTP enforcement server-side
    const otpModeCust = parseRequireOtpForRole(
      sessionCfg[getRequireOtpConfigKey(ROLES.CUSTOMER)] ?? 'required', ROLES.CUSTOMER
    )
    if (otpModeCust === 'required') {
      const adminDbCust = createServerSupabaseClient()
      const { data: custProfile } = await adminDbCust.from('user_profiles')
        .select('nomor_wa').eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle()
      cookieStore.set('otp_pending', '1', {
        httpOnly: false, path: '/', maxAge: 600, sameSite: 'strict',
      })
      return { ok: true, nama, uid, tenantId: claimTenantId, nomorWa: custProfile?.nomor_wa ?? '', role: ROLES.CUSTOMER }
    }
    await setCookiesLoginServer({ role: ROLES.CUSTOMER, tenantId: claimTenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)
    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.CUSTOMER, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.CUSTOMER, redirectTo), nama, uid, tenantId: claimTenantId, role: ROLES.CUSTOMER }
  }

  // ── Role tidak dikenal ────────────────────────────────────────────────────
  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
  return { ok: false, errorKey: 'login_error_role_tidak_ditemukan' }
}
