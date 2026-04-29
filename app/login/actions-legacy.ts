// app/login/actions-legacy.ts
// Server Actions login — Legacy actions (backward compatibility).
//
// DIPECAH dari actions.ts Sesi #074 — ATURAN 10 (file 15.8 KB melebihi batas 10 KB).
// File actions.ts sekarang hanya berisi loginUnifiedAction.
// File ini berisi 3 legacy actions yang dipertahankan untuk backward compatibility.
//
// CATATAN: Ketiga fungsi ini tidak lagi dipanggil dari useLoginFlow.ts (Sesi #068).
// loginUnifiedAction di actions.ts menangani semua role.
// Fungsi-fungsi ini dipertahankan sebagai referensi dan fallback darurat.

'use server'

import { createServerSupabaseClient }  from '@/lib/supabase-server'
import { getAccountLock }              from '@/lib/services/account-lock.service'
import { ROLES, ACCOUNT_LOCK_STATUS }  from '@/lib/constants'
import {
  decodeAppClaims, formatLockUntilWIB, hitungTujuanRedirectServer,
  setCookiesLoginServer, jalankanAfterTasksLogin, ambilNamaUser,
  buildLoginFormSchema, buatSupabaseSSR, prosesGagalLogin,
} from './login-action-helpers'
import type { LoginActionParams, LoginActionResult } from './actions'

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
// loginSuperadminAction — Legacy, dipertahankan untuk backward compatibility
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
// loginVendorAction — Legacy, dipertahankan untuk backward compatibility
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
// loginAdminTenantAction — Legacy, dipertahankan untuk backward compatibility
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
