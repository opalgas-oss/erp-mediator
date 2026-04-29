// app/login/actions.ts
// Server Actions login — Unified action untuk semua role.
//
// SPLIT Sesi #074: dipecah dari 15.8 KB → actions.ts + actions-legacy.ts + login-session-check.ts
// FIX Sesi #074: tambah concurrent session check (Vendor, AdminTenant) + Customer handler.
// REFACTOR Sesi #068: 1 signInWithPassword untuk semua role.
// PENTING: buatSupabaseSSR() → 1x cookies() → tidak ada regresi double-cookies +700ms.

'use server'

import { createServerSupabaseClient }  from '@/lib/supabase-server'
import { getAccountLock }              from '@/lib/services/account-lock.service'
import { ROLES, ACCOUNT_LOCK_STATUS }  from '@/lib/constants'
import {
  decodeAppClaims, formatLockUntilWIB, hitungTujuanRedirectServer,
  setCookiesLoginServer, jalankanAfterTasksLogin, ambilNamaUser,
  buildLoginFormSchema, buatSupabaseSSR, prosesGagalLogin,
} from './login-action-helpers'
import { cekSesiParalel } from './login-session-check'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface LoginActionParams {
  email:       string
  password:    string
  device:      string
  gpsKota:     string
  redirectTo?: string
}

export interface LoginActionResult {
  ok:               boolean
  errorKey?:        string
  errorVars?:       Record<string, string>
  redirectTo?:      string
  nama?:            string
  uid?:             string
  tenantId?:        string
  nomorWa?:         string
  sesiParalelAda?:  boolean
  sesiParalelData?: {
    device:   string
    gps_kota: string
    login_at: string | null
    role:     string
  }
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

  if (!buildLoginFormSchema().safeParse({ email, password }).success)
    return { ok: false, errorKey: 'login_error_umum' }

  const lock = await cekLockAwal(email)
  if (lock.locked) return lock.result

  const { supabase, cookieStore } = await buatSupabaseSSR()
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

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
    const [nama] = await Promise.all([
      ambilNamaUser(uid),
      setCookiesLoginServer({ role: ROLES.SUPERADMIN, tenantId: '', gpsKota }, cookieStore),
    ])
    jalankanAfterTasksLogin(
      { uid, tenantId: null, nama, role: ROLES.SUPERADMIN, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.SUPERADMIN, redirectTo), nama, uid }
  }

  // ── Semua role non-SA wajib punya tenantId di JWT ─────────────────────────
  if (!claimTenantId) {
    try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
    return { ok: false, errorKey: 'login_error_config_belum_lengkap' }
  }

  // ── VENDOR ────────────────────────────────────────────────────────────────
  if (role === ROLES.VENDOR) {
    const adminDb = createServerSupabaseClient()

    // FIX Sesi #074 PERF: cekSesiParalel dimasukkan ke Promise.all yang sama
    // agar tidak jadi sequential setelah profileQuery+setCookies — hemat ~300-600ms
    const [profileResult, , cekSesiResult] = await Promise.all([
      adminDb.from('user_profiles')
        .select('status, nama, nomor_wa')
        .eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle(),
      setCookiesLoginServer({ role: ROLES.VENDOR, tenantId: claimTenantId, gpsKota }, cookieStore),
      cekSesiParalel(uid, claimTenantId, ROLES.VENDOR),
    ])
    const profileRow = profileResult.data
    if ((profileRow?.status ?? '').toUpperCase() !== 'APPROVED') {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
      return { ok: false, errorKey: 'login_error_akun_belum_aktif' }
    }
    const nama    = profileRow?.nama     ?? (await ambilNamaUser(uid))
    const nomorWa = profileRow?.nomor_wa ?? ''

    if (cekSesiResult.adaSesi && cekSesiResult.sesiData) {
      return {
        ok: true, uid, tenantId: claimTenantId, nama, nomorWa,
        redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo),
        sesiParalelAda: true, sesiParalelData: cekSesiResult.sesiData,
      }
    }

    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.VENDOR, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.VENDOR, redirectTo), nama, uid, tenantId: claimTenantId, nomorWa }
  }

  // ── ADMIN TENANT ──────────────────────────────────────────────────────────
  if (role === ROLES.ADMIN_TENANT) {
    // FIX Sesi #074 PERF: cekSesiParalel dimasukkan ke Promise.all yang sama
    const [nama, , cekSesiResult] = await Promise.all([
      ambilNamaUser(uid),
      setCookiesLoginServer({ role: ROLES.ADMIN_TENANT, tenantId: claimTenantId, gpsKota }, cookieStore),
      cekSesiParalel(uid, claimTenantId, ROLES.ADMIN_TENANT),
    ])

    if (cekSesiResult.adaSesi && cekSesiResult.sesiData) {
      return {
        ok: true, uid, tenantId: claimTenantId, nama,
        redirectTo: hitungTujuanRedirectServer(ROLES.ADMIN_TENANT, redirectTo),
        sesiParalelAda: true, sesiParalelData: cekSesiResult.sesiData,
      }
    }

    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.ADMIN_TENANT, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.ADMIN_TENANT, redirectTo), nama, uid, tenantId: claimTenantId }
  }

  // ── CUSTOMER ──────────────────────────────────────────────────────────────
  // Customer tidak dicek sesi paralel — per research industri always diizinkan
  if (role === ROLES.CUSTOMER) {
    const [nama] = await Promise.all([
      ambilNamaUser(uid),
      setCookiesLoginServer({ role: ROLES.CUSTOMER, tenantId: claimTenantId, gpsKota }, cookieStore),
    ])
    jalankanAfterTasksLogin(
      { uid, tenantId: claimTenantId, nama, role: ROLES.CUSTOMER, device, gpsKota, hadAttempts: lock.hadAttempts, email },
      sessionId
    )
    return { ok: true, redirectTo: hitungTujuanRedirectServer(ROLES.CUSTOMER, redirectTo), nama, uid, tenantId: claimTenantId }
  }

  // ── Role tidak dikenal ────────────────────────────────────────────────────
  try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
  return { ok: false, errorKey: 'login_error_role_tidak_ditemukan' }
}
