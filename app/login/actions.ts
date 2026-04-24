// app/login/actions.ts
// Server Action untuk login SuperAdmin — LANGKAH 2 Sesi #058.
//
// TUJUAN: Gabungkan 5 operasi login SuperAdmin jadi 1 round-trip HTTP:
//   1. Cek account_locks           (service role, tanpa verifyJWT)
//   2. signInWithPassword           (server-side via @supabase/ssr — set cookie Supabase)
//   3. Validasi role = SUPERADMIN
//   4. Query users.nama
//   5. Set session cookies custom (session_role, session_tenant, gps_kota, session_login_at)
//   6. (after) INSERT session_logs + UPSERT user_presence + auto-unlock jika hadAttempts
//
// Saving vs flow lama: hilangkan 3-4 cold start + 3-4 verifyJWT() call (~400ms each) = ~2-3 detik.
//
// SCOPE: HANYA SUPERADMIN. Untuk role lain:
//   - action panggil supabase.auth.signOut() agar cookie Supabase bersih
//   - return { ok: false, errorKey: 'NOT_SUPERADMIN' }
//   - client (useLoginFlow) fallback ke flow lama (tanpa regresi untuk role non-SA)

'use server'

import { after }               from 'next/server'
import { cookies }             from 'next/headers'
import { createServerClient }  from '@supabase/ssr'
import { createServerSupabaseClient }        from '@/lib/supabase-server'
import { getAccountLock, incrementLockCount, unlockAccount } from '@/lib/services/account-lock.service'
import { create as createSessionLog }        from '@/lib/repositories/session-log.repository'
import { updateUserPresence }                from '@/lib/services/activity.service'
import { getPlatformTimezone, getConfigValues, parseConfigNumber } from '@/lib/config-registry'
import { ROLES, UNLOCK_METHOD, ACCOUNT_LOCK_STATUS } from '@/lib/constants'

// ─── Tipe Input ──────────────────────────────────────────────────────────────

export interface LoginSuperadminParams {
  email:    string
  password: string
  device:   string       // dari browser: User-Agent parsed
  gpsKota:  string       // dari gpsRef di client
}

// ─── Tipe Output ─────────────────────────────────────────────────────────────

export interface LoginSuperadminResult {
  ok:          boolean
  // Kalau gagal
  errorKey?:   string    // key untuk lookup di message_library (via m())
  errorVars?:  Record<string, string>
  // Kalau sukses (SUPERADMIN)
  redirectTo?: string
  nama?:       string
  uid?:        string
}

// ─── Map pesan error Supabase → key message_library ─────────────────────────
// Duplikat dari SUPABASE_ERROR_KEYS di app/login/login-types.ts — sengaja agar
// file server action ini tidak import dari file yang mungkin berstatus 'use client'.
const SUPABASE_ERROR_KEYS: Record<string, string> = {
  'Invalid login credentials': 'login_error_credentials_salah',
  'Email not confirmed':       'login_error_email_belum_konfirmasi',
  'Too many requests':         'login_error_terlalu_banyak_percobaan',
  'Network request failed':    'login_error_koneksi_gagal',
  'User not found':            'login_error_credentials_salah',
}

// ─── Helper: format lock_until jadi string "HH.mm WIB" ───────────────────────
async function formatLockUntilWIB(lockUntilISO: string): Promise<string> {
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

// ─── Helper: map error Supabase → errorKey ───────────────────────────────────
function mapSupabaseError(msg: string): string {
  const match = Object.entries(SUPABASE_ERROR_KEYS).find(
    ([k]) => msg.toLowerCase().includes(k.toLowerCase())
  )
  return match?.[1] ?? 'login_error_umum'
}

// ═════════════════════════════════════════════════════════════════════════════
// SERVER ACTION: loginSuperadminAction
// ═════════════════════════════════════════════════════════════════════════════

export async function loginSuperadminAction(
  params: LoginSuperadminParams
): Promise<LoginSuperadminResult> {
  const { email, password, device, gpsKota } = params

  // ─── 1. Cek account_locks (service role — cepat, tanpa verifyJWT) ──────────
  const lockDoc = await getAccountLock(email)
  if (lockDoc && lockDoc.status === ACCOUNT_LOCK_STATUS.LOCKED && lockDoc.lock_until) {
    const masihKunci = new Date(lockDoc.lock_until).getTime() > Date.now()
    if (masihKunci) {
      const lock_until_wib = await formatLockUntilWIB(lockDoc.lock_until)
      return {
        ok: false,
        errorKey: 'login_error_akun_dikunci',
        errorVars: { lock_until_wib },
      }
    }
  }
  const hadAttempts = (lockDoc?.count ?? 0) > 0

  // ─── 2. Sign in via @supabase/ssr — cookie Supabase akan ter-set via setAll() ─
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

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email, password,
  })

  // ─── 3. Handle error login ──────────────────────────────────────────────────
  if (authError || !authData?.session || !authData?.user) {
    // Password salah / user tidak ada → increment lock count untuk user yang ada
    const adminDb = createServerSupabaseClient()
    const { data: userRow } = await adminDb
      .from('users')
      .select('id, nama')
      .eq('email', email)
      .maybeSingle()

    if (userRow) {
      try {
        const incResult = await incrementLockCount({
          uid:      userRow.id,
          email,
          nama:     userRow.nama ?? '',
          nomor_wa: '',
          tenantId: null,
        })
        if (incResult.locked && incResult.lock_until) {
          const lock_until_wib = await formatLockUntilWIB(incResult.lock_until)
          return {
            ok: false,
            errorKey: 'login_error_akun_dikunci',
            errorVars: { lock_until_wib },
          }
        }
      } catch (err) {
        console.error('[loginSuperadminAction] incrementLockCount gagal:', err)
      }
    }
    return { ok: false, errorKey: mapSupabaseError(authError?.message ?? '') }
  }

  // ─── 4. Decode JWT claims — cek role ────────────────────────────────────────
  const token = authData.session.access_token
  const parts = token.split('.')
  if (parts.length !== 3) {
    return { ok: false, errorKey: 'login_error_umum' }
  }
  let role = ''
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>
    role = typeof claims['app_role'] === 'string' ? claims['app_role'] : ''
  } catch {
    return { ok: false, errorKey: 'login_error_umum' }
  }

  // ─── 5. Kalau BUKAN SUPERADMIN → signOut dan fallback ke flow lama ─────────
  if (role !== ROLES.SUPERADMIN) {
    try { await supabase.auth.signOut() } catch { /* abaikan */ }
    return { ok: false, errorKey: 'NOT_SUPERADMIN' }
  }

  // ─── 6. SUPERADMIN sukses — query nama + set cookies + fire background tasks ─
  const uid     = authData.user.id
  const adminDb = createServerSupabaseClient()
  const { data: userRow } = await adminDb
    .from('users')
    .select('nama')
    .eq('id', uid)
    .maybeSingle()
  const nama = userRow?.nama ?? ''

  // Baca config session timeout (fallback 480 menit = 8 jam)
  let sessionTimeoutMinutes = 480
  try {
    const cfg = await getConfigValues('security_login')
    sessionTimeoutMinutes = parseConfigNumber(cfg['session_timeout_minutes'], 480)
  } catch { /* pakai default */ }
  const maxAge  = sessionTimeoutMinutes * 60
  const loginAt = new Date().toISOString()

  // Set cookies custom — sama dengan aturCookieSession di flow lama
  cookieStore.set('session_role',     ROLES.SUPERADMIN, { path: '/', maxAge, sameSite: 'strict' })
  cookieStore.set('session_tenant',   '',               { path: '/', maxAge, sameSite: 'strict' })
  cookieStore.set('gps_kota',         gpsKota || 'Tidak Diketahui', { path: '/', maxAge })
  cookieStore.set('session_login_at', loginAt,          { path: '/', maxAge })

  // Generate sessionId SEKARANG supaya bisa dipakai after() — tidak perlu di-return ke client
  const sessionId = crypto.randomUUID()

  // Background tasks — tidak blok response
  after(async () => {
    // INSERT session_logs
    try {
      await createSessionLog({
        uid,
        tenantId: null,
        role:     ROLES.SUPERADMIN,
        device:   device || 'Unknown',
        gpsKota:  gpsKota || 'Tidak Diketahui',
        sessionId,
      })
    } catch (err) {
      console.error('[loginSuperadminAction after] session-log INSERT gagal:', err)
    }

    // UPSERT user_presence
    try {
      await updateUserPresence({
        uid,
        tenantId:         null,
        nama,
        role:             ROLES.SUPERADMIN,
        device:           device || 'Unknown',
        currentPage:      '/login',
        currentPageLabel: 'Halaman Login',
      })
    } catch (err) {
      console.error('[loginSuperadminAction after] user_presence UPSERT gagal:', err)
    }

    // Auto-unlock kalau sebelumnya pernah gagal (reset count)
    if (hadAttempts) {
      try {
        await unlockAccount({
          uid,
          email,
          method: UNLOCK_METHOD.AUTO,
        })
      } catch (err) {
        console.error('[loginSuperadminAction after] unlockAccount gagal:', err)
      }
    }
  })

  return {
    ok: true,
    redirectTo: '/dashboard/superadmin',
    nama,
    uid,
  }
}
