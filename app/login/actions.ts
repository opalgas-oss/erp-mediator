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
// FIX S#194 — Eliminasi 781ms GPS+Nominatim blocking di critical path login
//   Sebelumnya: gpsKota di-pass dari client (getGPSLocation+Nominatim 781ms blocking sebelum submit)
//   Sesudah: gpsKota dibaca dari Vercel header server-side via getGeoForAudit()
//   - 0ms overhead (header ter-inject di Vercel Edge Network sin1)
//   - Tidak perlu permission GPS browser (UX mulus, ~85% user tidak terganggu)
//   - Tidak melanggar Nominatim Usage Policy (komersial multi-tenant + rate limit)
//   - Compliant UU PDP No. 27/2022 (city-level only, bukan koordinat presisi = data minimization)
//   - Untuk OTP=required path: server set 'gps_kota' cookie eagerly supaya sidebar dashboard
//     tetap tampil kota setelah OTP verified (sebelumnya client set via aturCookieSession)
// FIX S#196 REK-A — Paralelisasi getGeoForAudit() di Promise.all
//   Sebelumnya: getGeoForAudit() sequential SEBELUM buatSupabaseSSR → menambah ~5-30ms overhead
//   Sesudah: getGeoForAudit() paralel di Promise.all bersama cekLock/signIn/getConfig
//   Justifikasi: getGeoForAudit hanya wrapper headers() read-only (lib/geo-server.ts) — no I/O,
//     no exception, no side-effect. Aman diparalelkan tanpa race condition concern.
//   Estimasi gain: -30 sampai -100ms TTFB warm (range, validasi di 3× test produksi)
//   Catatan: TIDAK pakai Promise.allSettled — fail-open behavior adalah optimasi terpisah (REK-B,
//     dijadwalkan S#197 setelah baseline REK-A terukur). Promise.all behavior konsisten dengan S#194.
// REVERT S#201 — Hapus sendMagicLinkAction (OPSI B Magic Link) — keputusan Philips:
//   Magic Link bukan flow yang common/mature untuk marketplace jasa Indonesia.
//   Flow 7-langkah tidak user-friendly. Problem TTFB <800ms dicari solusi lain.
// PENTING: buatSupabaseSSR() → 1x cookies() → tidak ada regresi double-cookies +700ms

'use server'

import { createServerSupabaseClient }          from '@/lib/supabase-server'
import { getAccountLock }                       from '@/lib/services/account-lock.service'
import { getConfigValues, parseConfigNumber }   from '@/lib/config-registry'
import { ROLES, ACCOUNT_LOCK_STATUS }           from '@/lib/constants'
import { SESSION_DEFAULT_TIMEOUT_MINUTES }       from '@/lib/auth'
import { parseRequireOtpForRole, getRequireOtpConfigKey } from '@/app/login/login-types'
import { getGeoForAudit }                       from '@/lib/geo-server'
import {
  decodeAppClaims, formatLockUntilWIB, hitungTujuanRedirectServer,
  setCookiesLoginServer, jalankanAfterTasksLogin,
  buildLoginFormSchema, buatSupabaseSSR, prosesGagalLogin,
} from './login-action-helpers'
// OTP Mode otp_only — Fase 3 Coding S#209 (TDD Step 3)
import { sendOTP }             from '@/lib/services/otp.service'
import { lookupUserByNomorWa } from '@/lib/utils/otp-only.server'

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface LoginActionParams {
  email:       string
  password:    string
  device:      string
  redirectTo?: string
  // FIX S#194: gpsKota dihapus — sekarang dibaca server-side via getGeoForAudit() dari Vercel header
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
  // HUTANG-LOGIN-STATUS-POPUP S#213 — data untuk pop-up informatif per kondisi status
  statusDetail?: {
    register_status:  string
    lifecycle_status: string | null
    email_kontak:     string
    pesan_key:        string
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

// ══════════════════════════════════════════════════════════════════════════════
// loginUnifiedAction
// ═════════════════════════════════════════════════════════════════════════════

export async function loginUnifiedAction(params: LoginActionParams): Promise<LoginActionResult> {
  const { email, password, device, redirectTo } = params

  // FIX S#191 (Step 4): quick sanity check — gagal cepat untuk input yang jelas tidak valid
  //   Tanpa ini: input invalid tetap memicu 3 DB calls (lock + signIn + config) dalam Promise.all
  //   Default fallback 6 (BUKAN parseConfigNumber — sessionCfg belum tersedia di titik ini)
  //   Validasi penuh tetap berjalan setelah getConfigValues sukses dengan nilai aktual config
  if (!email.includes('@') || password.length < 6) {
    return { ok: false, errorKey: 'login_error_umum' }
  }

  // FIX S#196 REK-A: getGeoForAudit() dipindah ke Promise.all (lihat catatan header).
  //   gpsKota di-extract setelah Promise.all selesai — tersedia untuk semua cabang downstream
  //   (5 jalur OTP=required cookieStore.set + 4 jalur OTP=disabled setCookiesLoginServer).

  // [S190] TIMING LOG — digunakan untuk audit performa BUG-021 Layer 2 Fase 1
  // AKAN DIHAPUS setelah data timing terkumpul (HUTANG-BUG021-TIMING-CLEANUP-S191)
  const t_start = performance.now()
  const { supabase, cookieStore } = await buatSupabaseSSR()
  console.log(`[S190] buatSupabaseSSR: ${(performance.now() - t_start).toFixed(1)}ms`)

  const t_parallel = performance.now()
  const [geoFromVercel, lock, authResult, sessionCfg] = await Promise.all([
    getGeoForAudit(),
    cekLockAwal(email),
    supabase.auth.signInWithPassword({ email, password }),
    getConfigValues('security_login'),
  ])
  console.log(`[S190] Promise.all-block: ${(performance.now() - t_parallel).toFixed(1)}ms`)

  const gpsKota = geoFromVercel.kota || 'Tidak Diketahui'

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
      // FIX S#194: server set gps_kota cookie eagerly (pre-OTP-verify) supaya sidebar dashboard
      // tetap tampil kota setelah OTP verified + redirect. Cookie ini independent dari session —
      // aman di-set sebelum OTP diverifikasi (tidak memberikan akses dashboard).
      cookieStore.set('gps_kota', gpsKota, { path: '/', maxAge: sessionTimeoutMinutes * 60 })
      cookieStore.set('otp_pending', '1', {
        httpOnly: false,
        path: '/',
        maxAge: 600,
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
        // HUTANG-LOGIN-STATUS-POPUP S#213: return statusDetail untuk pop-up informatif
        const vStatus  = claims.vendorStatus.toLowerCase()
        const pesanKey = vStatus === 'rejected'
          ? 'login_status_ditolak_vendor'
          : 'login_status_review_vendor'
        const adminDbV1 = createServerSupabaseClient()
        const { data: tenantRowV1 } = await adminDbV1.from('tenants')
          .select('pic_email, email_resmi').eq('id', claimTenantId).maybeSingle()
        const emailKontak = tenantRowV1?.pic_email ?? tenantRowV1?.email_resmi ?? ''
        return {
          ok: false,
          errorKey: 'login_error_akun_belum_aktif',
          statusDetail: { register_status: vStatus, lifecycle_status: null, email_kontak: emailKontak, pesan_key: pesanKey },
        }
      }
      const otpModeVendor1 = parseRequireOtpForRole(
        sessionCfg[getRequireOtpConfigKey(ROLES.VENDOR)] ?? 'required', ROLES.VENDOR
      )
      if (otpModeVendor1 === 'required') {
        // FIX S#194: server set gps_kota cookie eagerly (lihat catatan di jalur SA OTP=required)
        cookieStore.set('gps_kota', gpsKota, { path: '/', maxAge: sessionTimeoutMinutes * 60 })
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
      .select('register_status, lifecycle_status, nomor_wa')  // + lifecycle_status S#213
      .eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle()

    const vRegStatus = profileRow?.register_status ?? 'pending'
    const vLcStatus  = profileRow?.lifecycle_status ?? null

    // HUTANG-LOGIN-STATUS-POPUP S#213: cek approved + lifecycle (termasuk belum aktivasi)
    if (vRegStatus !== 'approved' || vLcStatus === 'pending') {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
      let pesanKeyV2: string
      let emailKontakV2: string
      if (vRegStatus === 'approved' && vLcStatus === 'pending') {
        pesanKeyV2    = 'login_status_belum_aktivasi'
        emailKontakV2 = ''
      } else {
        pesanKeyV2 = vRegStatus === 'rejected' ? 'login_status_ditolak_vendor' : 'login_status_review_vendor'
        const { data: tenantRowV2 } = await adminDb.from('tenants')
          .select('pic_email, email_resmi').eq('id', claimTenantId).maybeSingle()
        emailKontakV2 = tenantRowV2?.pic_email ?? tenantRowV2?.email_resmi ?? ''
      }
      return {
        ok: false,
        errorKey: 'login_error_akun_belum_aktif',
        statusDetail: { register_status: vRegStatus, lifecycle_status: vLcStatus, email_kontak: emailKontakV2, pesan_key: pesanKeyV2 },
      }
    }
    const nomorWa = profileRow?.nomor_wa ?? ''
    const otpModeVendor2 = parseRequireOtpForRole(
      sessionCfg[getRequireOtpConfigKey(ROLES.VENDOR)] ?? 'required', ROLES.VENDOR
    )
    if (otpModeVendor2 === 'required') {
      // FIX S#194: server set gps_kota cookie eagerly (lihat catatan di jalur SA OTP=required)
      cookieStore.set('gps_kota', gpsKota, { path: '/', maxAge: sessionTimeoutMinutes * 60 })
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

    // HUTANG-LOGIN-STATUS-POPUP S#213: cek register_status + lifecycle_status AT sebelum OTP/login
    // AT yang pending/review/rejected tidak boleh masuk dashboard
    const adminDbAT0 = createServerSupabaseClient()
    const { data: atStatusRow } = await adminDbAT0.from('user_profiles')
      .select('register_status, lifecycle_status')
      .eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle()
    const atRegStatus = atStatusRow?.register_status ?? 'pending'
    const atLcStatus  = atStatusRow?.lifecycle_status ?? null
    if (atRegStatus !== 'approved' || atLcStatus === 'pending') {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* abaikan */ }
      let pesanKeyAT: string
      let emailKontakAT: string
      if (atRegStatus === 'approved' && atLcStatus === 'pending') {
        pesanKeyAT    = 'login_status_belum_aktivasi'
        emailKontakAT = ''
      } else {
        pesanKeyAT = atRegStatus === 'rejected' ? 'login_status_ditolak_admintenant' : 'login_status_review_admintenant'
        const { data: saRow } = await adminDbAT0.from('users').select('email').limit(1).maybeSingle()
        emailKontakAT = saRow?.email ?? ''
      }
      return {
        ok: false,
        errorKey: 'login_error_akun_belum_aktif',
        statusDetail: { register_status: atRegStatus, lifecycle_status: atLcStatus, email_kontak: emailKontakAT, pesan_key: pesanKeyAT },
      }
    }

    const otpModeAT = parseRequireOtpForRole(
      sessionCfg[getRequireOtpConfigKey(ROLES.ADMIN_TENANT)] ?? 'required', ROLES.ADMIN_TENANT
    )
    if (otpModeAT === 'required') {
      const adminDbAT = createServerSupabaseClient()
      const { data: atProfile } = await adminDbAT.from('user_profiles')
        .select('nomor_wa').eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle()
      // FIX S#194: server set gps_kota cookie eagerly (lihat catatan di jalur SA OTP=required)
      cookieStore.set('gps_kota', gpsKota, { path: '/', maxAge: sessionTimeoutMinutes * 60 })
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
    const otpModeCust = parseRequireOtpForRole(
      sessionCfg[getRequireOtpConfigKey(ROLES.CUSTOMER)] ?? 'required', ROLES.CUSTOMER
    )
    if (otpModeCust === 'required') {
      const adminDbCust = createServerSupabaseClient()
      const { data: custProfile } = await adminDbCust.from('user_profiles')
        .select('nomor_wa').eq('id', uid).eq('tenant_id', claimTenantId).maybeSingle()
      // FIX S#194: server set gps_kota cookie eagerly (lihat catatan di jalur SA OTP=required)
      cookieStore.set('gps_kota', gpsKota, { path: '/', maxAge: sessionTimeoutMinutes * 60 })
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

// ══════════════════════════════════════════════════════════════════════════════
// initOtpOnlyAction — S#209 TDD Step 3
// ══════════════════════════════════════════════════════════════════════════════

export interface InitOtpOnlyParams {
  nomorHp:        string   // input nomor HP dari user — untuk lookup di DB
  roleSelected?:  string   // diisi jika multi-role + user sudah pilih role
  device:         string
}

export interface InitOtpOnlyResult {
  ok:              boolean
  errorKey?:       string
  // Jika multi-role: client tampilkan role selector dulu
  needRoleSelect?: boolean
  roles?:          Array<{ role: string; label: string }>
  // Jika OTP berhasil dikirim:
  otpSent?:        boolean
  uid?:            string
  nama?:           string
  email?:          string  // dipakai finishOtpOnlyAction untuk generateLink
  tenantId?:       string
  role?:           string
  nomorWaDb?:      string  // nomor yang tersimpan di DB (ke sini OTP dikirim)
  resendCooldown?: number
  maxAttempts?:    number
}

/**
 * Server Action untuk mode otp_only: verifikasi nomor HP di DB, kirim OTP ke nomor DB.
 * Cek user_profiles (non-SA) DAN tabel users (SA) agar SA support otp_only (per BRD BR-01).
 * OTP dikirim ke nomor yang tersimpan di DB — BUKAN ke nomor input user (keamanan).
 */
export async function initOtpOnlyAction(params: InitOtpOnlyParams): Promise<InitOtpOnlyResult> {
  const { nomorHp, roleSelected, device: _device } = params

  // STEP 0: Validasi format dasar nomor HP
  const clean = nomorHp.replace(/[\s\-().]/g, '')
  if (clean.length < 9) {
    return { ok: false, errorKey: 'login_error_umum' }
  }

  // STEP 1: Lookup user berdasarkan nomor WA
  // lookupUserByNomorWa cek user_profiles (Vendor/Customer/AT) + users SA — fix gap TDD-Q4
  const profiles = await lookupUserByNomorWa(nomorHp)

  if (!profiles || profiles.length === 0) {
    // Generic error — tidak reveal apakah nomor terdaftar (security per OWASP)
    return { ok: false, errorKey: 'login_error_credentials_salah' }
  }

  // STEP 2: Multi-role? Jika ya dan role belum dipilih — minta pilih role dulu
  const ROLE_LABEL: Record<string, string> = {
    customer:     'Customer',
    vendor:       'Vendor',
    admin_tenant: 'Admin Tenant',
    super_admin:  'Super Admin',
  }

  if (profiles.length > 1 && !roleSelected) {
    return {
      ok:             true,
      needRoleSelect: true,
      roles:          profiles.map(p => ({ role: p.role, label: ROLE_LABEL[p.role] ?? p.role })),
    }
  }

  // STEP 3: Ambil profil yang sesuai (single atau sudah dipilih role)
  const profile = roleSelected
    ? (profiles.find(p => p.role === roleSelected) ?? profiles[0])
    : profiles[0]

  // STEP 4: Nomor WA tidak ada di profil — per FSD 5.3 fallback password
  if (!profile.nomor_wa) {
    return { ok: false, errorKey: 'login_error_credentials_salah' }
  }

  // STEP 5: Kirim OTP ke nomor WA YANG TERSIMPAN DI DB (bukan nomor input user)
  // Pakai sendOTP langsung (bukan HTTP fetch) — DRY + efisien (ATURAN 11)
  const sendResult = await sendOTP({
    uid:      profile.id,
    tenantId: profile.tenant_id ?? '',
    role:     profile.role,
    nomorWa:  profile.nomor_wa,
    email:    profile.email,
    nama:     profile.nama,
  })

  if (!sendResult.success) {
    const errorKey = sendResult.errorCode === 'MAX_ATTEMPTS' || sendResult.errorCode === 'RESEND_LIMIT'
      ? 'otp_error_batas_habis'
      : 'login_error_koneksi_gagal'
    return { ok: false, errorKey }
  }

  return {
    ok:             true,
    otpSent:        true,
    uid:            profile.id,
    nama:           profile.nama,
    email:          profile.email,
    tenantId:       profile.tenant_id ?? '',
    role:           profile.role,
    nomorWaDb:      profile.nomor_wa,
    resendCooldown: sendResult.resend_cooldown_seconds ?? 60,
    maxAttempts:    sendResult.otp_max_attempts ?? 3,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// finishOtpOnlyAction — S#209 TDD Step 3
// ══════════════════════════════════════════════════════════════════════════════

export interface FinishOtpOnlyParams {
  uid:      string
  tenantId: string
  role:     string
  device:   string
  nama:     string
  email:    string  // dari initOtpOnlyAction result — dipakai generateLink
}

export interface FinishOtpOnlyResult {
  ok:          boolean
  errorKey?:   string
  redirectTo?: string
}

/**
 * Server Action untuk menyelesaikan login otp_only setelah OTP diverifikasi.
 * Buat Supabase session via admin.generateLink + verifyOtp — MURNI server internal.
 * User tidak pernah melihat/menerima link apapun. Berbeda 100% dari S#200 Magic Link UX:
 *   S#200: user terima email → klik link → 7 langkah user-facing (DIREVERT)
 *   finishOtpOnlyAction: server internal, user hanya input nomor HP + OTP WA (2 langkah)
 */
export async function finishOtpOnlyAction(params: FinishOtpOnlyParams): Promise<FinishOtpOnlyResult> {
  const { uid, tenantId, role, device, nama, email } = params

  const { supabase, cookieStore } = await buatSupabaseSSR()
  const geoResult = await getGeoForAudit()
  const gpsKota   = geoResult.kota || 'Tidak Diketahui'

  // STEP 1: Generate token via Admin API (tidak mengirim email ke user)
  // admin.generateLink mengembalikan hashed_token TANPA auto-send email untuk admin call.
  // Server langsung consume token ini — token tidak pernah keluar dari server.
  const adminDb = createServerSupabaseClient()
  const { data: linkData, error: linkError } = await adminDb.auth.admin.generateLink({
    type:  'magiclink',
    email: email,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('[finishOtpOnlyAction] generateLink gagal:', linkError?.message ?? 'no hashed_token')
    return { ok: false, errorKey: 'login_error_gagal_selesaikan' }
  }

  // STEP 2: Exchange token server-side → Supabase auth session + JWT cookies ter-set
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type:       'email',
  })

  if (verifyError) {
    console.error('[finishOtpOnlyAction] verifyOtp gagal:', verifyError.message)
    return { ok: false, errorKey: 'login_error_gagal_selesaikan' }
  }

  // STEP 3: Set app-level session cookies + background tasks
  const sessionCfg = await getConfigValues('security_login')
  const sessionTimeoutMinutes = parseConfigNumber(
    sessionCfg['session_timeout_minutes'], SESSION_DEFAULT_TIMEOUT_MINUTES
  )

  await setCookiesLoginServer({ role, tenantId, gpsKota, sessionTimeoutMinutes }, cookieStore)

  const sessionId = crypto.randomUUID()
  jalankanAfterTasksLogin(
    { uid, tenantId: tenantId || null, nama, role, device, gpsKota, hadAttempts: false, email },
    sessionId
  )

  return {
    ok:         true,
    redirectTo: hitungTujuanRedirectServer(role, ''),
  }
}
