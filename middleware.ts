// middleware.ts — letaknya di ROOT folder, sejajar dengan folder app/
// Berjalan di Edge Runtime — tidak boleh import library Node.js
//
// OPTIMASI Sesi #075 — getClaims() fast path
// PERUBAHAN Sesi #064 — fix double getUser
// FIX Sesi #157 — B1-04 (T-038): vendor blocked status guard
// FIX S#183e — otp_pending guard (2 tempat):
//   1. Guard 1B (/login): jika otp_pending ada → stay di /login (bukan redirect dashboard)
//      Mencegah redirect loop: /login→dashboard→/login→...
//   2. Guard 5 (/dashboard): jika otp_pending ada → redirect /login
//      Mencegah SA bypass OTP via Supabase JWT yang masih valid (set oleh signInWithPassword)
//   loginUnifiedAction set otp_pending=1 untuk SA OTP=required
//   selesaiLogin() hapus otp_pending (document.cookie) setelah OTP diverifikasi
//
// PERUBAHAN 8 Juni 2026 CASE SESI-12 (AUTH Normalized — keputusan Philips):
//   - extractRoleFromAppMeta() (baca app_role flat) DIHAPUS sebagai jalur utama
//   - Prioritas: is_super_admin flag + memberships[] sebagai sumber utama
//   - app_role flat dihapus dari semua jalur baca
//   - Perbandingan role menggunakan ROLES.* (lowercase via roles.constant.ts)
//   - Ref: KEPUTUSAN_AUTH_NORMALIZED_v1.md ATURAN 44
//
// FIX 8 Juni 2026 SESI-16 — Guard 6 tambahan untuk /api/superadmin/* + /api/admintenant/*:
//   - Guard 5 hanya cover /dashboard — API route tidak dapat header x-is-super-admin
//   - requireSuperAdmin() di semua API route SA selalu return 401 karena header kosong
//   - Fix: Guard 6 inject auth headers ke /api/superadmin/* dan /api/admintenant/*
//
// TAMBAH 10 Juni 2026 CASE SESI-25 — Pintu login 4 pintu (BLUEPRINT_LOGIN_4_PINTU_v1):
//   - /sa/masuk     → pintu SuperAdmin (tidak dari homepage)
//   - /kelola/masuk → pintu AdminTenant (tidak dari homepage)
//   - PUBLIC_PATHS + Guard 1B diperluas untuk 2 path baru ini
//
// FIX S#292 — Guard 6: tambah /api/monitoring/ agar requireSuperAdmin() dapat header
//   x-is-super-admin. Root cause SSE + history API 403: Guard 6 tidak cover /api/monitoring/

import { createServerClient } from '@supabase/ssr'
import { NextResponse }        from 'next/server'
import type { NextRequest }    from 'next/server'
import { ROLES, VENDOR_LOGIN_ALLOWED, ROLE_TO_DASHBOARD } from '@/lib/constants'

// Konstanta Route Publik
const PUBLIC_PATHS: string[] = [
  '/',
  '/login',
  '/register',
  '/pending-approval',
  '/init-philipsliemena',
  '/forgot-password',
  '/reset-password',
  '/auth/confirm',
  '/auth/verify',
  '/sa/masuk',
  '/at/masuk',
]

const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|ico|css|js|webp|woff|woff2|ttf)$/i

const DASHBOARD_ROLE_MAP: Record<string, string> = {
  '/dashboard/customer':    ROLES.CUSTOMER,
  '/dashboard/vendor':      ROLES.VENDOR,
  '/dashboard/admin':       ROLES.ADMIN_TENANT,
  '/dashboard/admintenant': ROLES.ADMIN_TENANT,
  '/dashboard/superadmin':  ROLES.SUPERADMIN,
}

interface JwtMembership {
  tenant_id: string | null
  role:      string
  status:    string
}

function extractMembershipsFromPayload(payload: Record<string, unknown>): {
  memberships:  JwtMembership[]
  isSuperAdmin: boolean
} {
  const raw = payload['memberships']
  const memberships: JwtMembership[] = Array.isArray(raw) ? (raw as JwtMembership[]) : []
  const isSuperAdmin = payload['is_super_admin'] === true
  return { memberships, isSuperAdmin }
}

function resolveRoleFromMemberships(memberships: JwtMembership[]): { role?: string; tenantId?: string } {
  if (memberships.length === 0) return {}
  const first = memberships[0]
  return { role: first.role ?? undefined, tenantId: first.tenant_id ?? undefined }
}

async function decodeJwtFromSession(supabase: ReturnType<typeof createServerClient>): Promise<{
  userId?: string
  isSuperAdmin: boolean
  memberships: JwtMembership[]
  role?: string
  tenantId?: string
  displayName?: string
}> {
  try {
    const claimsResult = await (supabase.auth as unknown as {
      getClaims: () => Promise<{ data: { claims: Record<string, unknown> } | null; error: unknown }>
    }).getClaims()

    if (!claimsResult.error && claimsResult.data?.claims) {
      const c           = claimsResult.data.claims
      const userId      = typeof c['sub'] === 'string' ? c['sub'] : undefined
      const umeta       = (typeof c['user_metadata'] === 'object' && c['user_metadata'] !== null) ? c['user_metadata'] as Record<string, unknown> : {}
      const appMeta     = (typeof c['app_metadata']  === 'object' && c['app_metadata']  !== null) ? c['app_metadata']  as Record<string, unknown> : {}
      const displayName = typeof appMeta['nama'] === 'string' ? appMeta['nama']
                        : typeof umeta['nama']   === 'string' ? umeta['nama']
                        : typeof c['email']      === 'string' ? c['email'] : userId
      const { memberships, isSuperAdmin } = extractMembershipsFromPayload(c)
      let role: string | undefined
      let tenantId: string | undefined
      if (isSuperAdmin) {
        role = ROLES.SUPERADMIN
      } else if (memberships.length > 0) {
        const resolved = resolveRoleFromMemberships(memberships)
        role = resolved.role; tenantId = resolved.tenantId
      }
      return { userId, isSuperAdmin, memberships, role, tenantId, displayName }
    }
  } catch { /* fallback */ }

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    try {
      const parts = session.access_token.split('.')
      if (parts.length === 3) {
        const payload     = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        const userId      = typeof payload['sub'] === 'string' ? payload['sub'] : undefined
        const umeta       = (payload['user_metadata'] as Record<string, unknown>) ?? {}
        const displayName = typeof umeta['nama']    === 'string' ? umeta['nama']
                          : typeof payload['email'] === 'string' ? payload['email'] : userId
        const { memberships, isSuperAdmin } = extractMembershipsFromPayload(payload)
        let role: string | undefined
        let tenantId: string | undefined
        if (isSuperAdmin) {
          role = ROLES.SUPERADMIN
        } else if (memberships.length > 0) {
          const resolved = resolveRoleFromMemberships(memberships)
          role = resolved.role; tenantId = resolved.tenantId
        }
        return { userId, isSuperAdmin, memberships, role, tenantId, displayName }
      }
    } catch { /* abaikan */ }
  }
  return { isSuperAdmin: false, memberships: [] }
}

// ─── Middleware Utama ──────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = request.nextUrl

    if (PUBLIC_PATHS.includes(pathname) && pathname !== '/login'
        && pathname !== '/sa/masuk' && pathname !== '/kelola/masuk') return NextResponse.next()

    if (pathname === '/sa/masuk') {
      if (request.cookies.get('otp_pending')?.value === '1') return NextResponse.next()
      let saMasukResponse = NextResponse.next({ request })
      const supabaseSA = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: { getAll() { return request.cookies.getAll() }, setAll(c) { c.forEach(({ name, value }) => request.cookies.set(name, value)); saMasukResponse = NextResponse.next({ request }); c.forEach(({ name, value, options }) => saMasukResponse.cookies.set(name, value, options)) } }
      })
      const { data: { user: saMasukUser } } = await supabaseSA.auth.getUser()
      if (saMasukUser) {
        const { role: saMasukRole } = await decodeJwtFromSession(supabaseSA)
        if (saMasukRole === ROLES.SUPERADMIN && ROLE_TO_DASHBOARD[ROLES.SUPERADMIN]) return NextResponse.redirect(new URL(ROLE_TO_DASHBOARD[ROLES.SUPERADMIN], request.url))
      }
      return saMasukResponse
    }

    if (pathname === '/at/masuk') {
      if (request.cookies.get('otp_pending')?.value === '1') return NextResponse.next()
      let atMasukResponse = NextResponse.next({ request })
      const supabaseAT = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: { getAll() { return request.cookies.getAll() }, setAll(c) { c.forEach(({ name, value }) => request.cookies.set(name, value)); atMasukResponse = NextResponse.next({ request }); c.forEach(({ name, value, options }) => atMasukResponse.cookies.set(name, value, options)) } }
      })
      const { data: { user: atMasukUser } } = await supabaseAT.auth.getUser()
      if (atMasukUser) {
        const { role: atMasukRole } = await decodeJwtFromSession(supabaseAT)
        if (atMasukRole === ROLES.ADMIN_TENANT && ROLE_TO_DASHBOARD[ROLES.ADMIN_TENANT]) return NextResponse.redirect(new URL(ROLE_TO_DASHBOARD[ROLES.ADMIN_TENANT], request.url))
      }
      return atMasukResponse
    }

    if (pathname === '/login') {
      if (request.cookies.get('otp_pending')?.value === '1') return NextResponse.next()
      let loginResponse = NextResponse.next({ request })
      const supabaseLogin = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: { getAll() { return request.cookies.getAll() }, setAll(c) { c.forEach(({ name, value }) => request.cookies.set(name, value)); loginResponse = NextResponse.next({ request }); c.forEach(({ name, value, options }) => loginResponse.cookies.set(name, value, options)) } }
      })
      const { data: { user: loginUser } } = await supabaseLogin.auth.getUser()
      if (loginUser) {
        const { role: loginRole } = await decodeJwtFromSession(supabaseLogin)
        if (loginRole === ROLES.VENDOR) return loginResponse
        if (loginRole && ROLE_TO_DASHBOARD[loginRole]) return NextResponse.redirect(new URL(ROLE_TO_DASHBOARD[loginRole], request.url))
      }
      return loginResponse
    }

    if (pathname.startsWith('/_next/') || pathname.startsWith('/api/auth/')) return NextResponse.next()
    if (STATIC_EXTENSIONS.test(pathname)) return NextResponse.next()
    if (pathname === '/favicon.ico') return NextResponse.next()

    // ─── Guard 6 — Inject auth headers ke semua API route SA ──────────────────
    // FIX S#292: tambah /api/monitoring/ agar requireSuperAdmin() dapat header x-is-super-admin
    // Tanpa ini, semua client-side fetch ke /api/monitoring/* selalu 403.
    if (
      pathname.startsWith('/api/superadmin/') ||
      pathname.startsWith('/api/admintenant/') ||
      pathname.startsWith('/api/config/')      ||
      pathname.startsWith('/api/monitoring/')
    ) {
      const supabaseApi = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: { getAll() { return request.cookies.getAll() }, setAll() {} }
      })
      const { userId, isSuperAdmin, memberships, role, tenantId, displayName } = await decodeJwtFromSession(supabaseApi)
      const apiHeaders = new Headers(request.headers)
      apiHeaders.delete('x-user-id'); apiHeaders.delete('x-user-role'); apiHeaders.delete('x-tenant-id')
      apiHeaders.delete('x-user-display-name'); apiHeaders.delete('x-user-memberships'); apiHeaders.delete('x-is-super-admin')
      if (userId) {
        apiHeaders.set('x-user-id',          userId)
        apiHeaders.set('x-user-role',         role ?? '')
        apiHeaders.set('x-tenant-id',         tenantId ?? '')
        apiHeaders.set('x-user-display-name', displayName ?? userId)
        apiHeaders.set('x-user-memberships',  memberships.length > 0 ? JSON.stringify(memberships) : '')
        apiHeaders.set('x-is-super-admin',    String(isSuperAdmin))
      }
      return NextResponse.next({ request: { headers: apiHeaders } })
    }

    // ─── Guard 5 — Proteksi route /dashboard ──────────────────────────────────
    if (pathname.startsWith('/dashboard')) {
      if (request.cookies.get('otp_pending')?.value === '1') return NextResponse.redirect(new URL('/login', request.url))

      let response = NextResponse.next({ request })
      const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: { getAll() { return request.cookies.getAll() }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } }
      })

      let userRole: string | undefined, tenantId: string | undefined, userId: string | undefined
      let displayName: string | undefined, vendorStatus: string | undefined
      let tokenRefreshNeeded = false
      let memberships: JwtMembership[] = [], isSuperAdmin = false

      try {
        const claimsResult = await (supabase.auth as unknown as { getClaims: () => Promise<{ data: { claims: Record<string, unknown> } | null; error: unknown }> }).getClaims()
        if (!claimsResult.error && claimsResult.data?.claims) {
          const c       = claimsResult.data.claims
          const appMeta = (typeof c['app_metadata'] === 'object' && c['app_metadata'] !== null) ? c['app_metadata'] as Record<string, unknown> : {}
          const umeta   = (typeof c['user_metadata'] === 'object' && c['user_metadata'] !== null) ? c['user_metadata'] as Record<string, unknown> : {}
          userId      = typeof c['sub'] === 'string' ? c['sub'] : undefined
          displayName = typeof appMeta['nama'] === 'string' ? appMeta['nama'] : typeof umeta['nama'] === 'string' ? umeta['nama'] : typeof c['email'] === 'string' ? c['email'] : userId
          const e = extractMembershipsFromPayload(c); memberships = e.memberships; isSuperAdmin = e.isSuperAdmin
          if (isSuperAdmin) { userRole = ROLES.SUPERADMIN } else if (memberships.length > 0) { const r = resolveRoleFromMemberships(memberships); userRole = r.role; tenantId = r.tenantId ?? tenantId }
          vendorStatus = typeof c['vendor_status'] === 'string' ? c['vendor_status'] : typeof appMeta['vendor_status'] === 'string' ? appMeta['vendor_status'] : undefined
        }
      } catch { /* fallback */ }

      if (!userRole || !userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.redirect(new URL('/login', request.url))
        userId = user.id; displayName = typeof user.user_metadata?.['nama'] === 'string' ? user.user_metadata['nama'] : user.email ?? user.id; tokenRefreshNeeded = true
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          try {
            const parts = session.access_token.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
              const e = extractMembershipsFromPayload(payload); memberships = e.memberships; isSuperAdmin = e.isSuperAdmin
              if (isSuperAdmin) { userRole = ROLES.SUPERADMIN } else if (memberships.length > 0) { const r = resolveRoleFromMemberships(memberships); userRole = r.role; tenantId = r.tenantId ?? '' }
              if (!vendorStatus && typeof payload['vendor_status'] === 'string') vendorStatus = payload['vendor_status']
            }
          } catch { /* abaikan */ }
        }
      }

      if (!userRole || !userId) return NextResponse.redirect(new URL('/login', request.url))

      if (userRole === ROLES.VENDOR && pathname.startsWith('/dashboard/vendor')) {
        if (vendorStatus && !(VENDOR_LOGIN_ALLOWED as string[]).includes(vendorStatus.toLowerCase())) return NextResponse.redirect(new URL('/pending-approval', request.url))
      }

      const requestHeaders = new Headers(request.headers)
      requestHeaders.delete('x-user-id'); requestHeaders.delete('x-user-role'); requestHeaders.delete('x-tenant-id')
      requestHeaders.delete('x-user-display-name'); requestHeaders.delete('x-vendor-status')
      requestHeaders.delete('x-user-memberships'); requestHeaders.delete('x-is-super-admin')
      requestHeaders.set('x-user-id', userId); requestHeaders.set('x-user-role', userRole)
      requestHeaders.set('x-tenant-id', tenantId ?? ''); requestHeaders.set('x-user-display-name', displayName ?? userId)
      if (vendorStatus) requestHeaders.set('x-vendor-status', vendorStatus)
      requestHeaders.set('x-user-memberships', memberships.length > 0 ? JSON.stringify(memberships) : '')
      requestHeaders.set('x-is-super-admin', String(isSuperAdmin))

      const enrichedResponse = NextResponse.next({ request: { headers: requestHeaders } })
      if (tokenRefreshNeeded) response.headers.getSetCookie().forEach(cookie => enrichedResponse.headers.append('Set-Cookie', cookie))
      response = enrichedResponse

      const timeoutMenit = (() => { const raw = request.cookies.get('session_timeout_minutes')?.value; const val = raw ? parseInt(raw, 10) : NaN; return !isNaN(val) && val > 0 ? val : null })()
      if (timeoutMenit !== null) {
        const sekarang = Date.now(); const lastActiveStr = request.cookies.get('session_last_active')?.value
        if (lastActiveStr) { const lastActiveMs = parseInt(lastActiveStr, 10); const timeoutMs = timeoutMenit * 60 * 1000; if (!isNaN(lastActiveMs) && sekarang - lastActiveMs > timeoutMs) return NextResponse.redirect(new URL('/login?reason=timeout', request.url)) }
      }

      let requiredRole: string | null = null
      for (const [dashboardPath, role] of Object.entries(DASHBOARD_ROLE_MAP)) { if (pathname.startsWith(dashboardPath)) { requiredRole = role; break } }

      if (requiredRole === null) { if (timeoutMenit !== null) response.cookies.set('session_last_active', String(Date.now()), { path: '/', maxAge: timeoutMenit * 60, sameSite: 'strict', httpOnly: true }); return response }
      if (userRole === requiredRole) { if (timeoutMenit !== null) response.cookies.set('session_last_active', String(Date.now()), { path: '/', maxAge: timeoutMenit * 60, sameSite: 'strict', httpOnly: true }); return response }

      const redirectPath = ROLE_TO_DASHBOARD[userRole]
      if (redirectPath) return NextResponse.redirect(new URL(redirectPath, request.url))
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Semua halaman kecuali asset statis Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // API routes SA yang butuh auth header injection via Guard 6
    // Wajib eksplisit — Next.js tidak selalu menjalankan middleware untuk /api/* dengan pattern di atas
    '/api/superadmin/:path*',
    '/api/admintenant/:path*',
    '/api/config/:path*',
    '/api/monitoring/:path*',
  ],
}
