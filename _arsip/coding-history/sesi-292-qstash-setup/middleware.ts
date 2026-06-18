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
  // BLUEPRINT_LOGIN_4_PINTU_v1 — pintu terpisah SA + AT (Opsi A path-based)
  '/sa/masuk',
  '/at/masuk',
]

const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|ico|css|js|webp|woff|woff2|ttf)$/i

// Pemetaan Dashboard per Role
const DASHBOARD_ROLE_MAP: Record<string, string> = {
  '/dashboard/customer':    ROLES.CUSTOMER,
  '/dashboard/vendor':      ROLES.VENDOR,
  '/dashboard/admin':       ROLES.ADMIN_TENANT,
  '/dashboard/admintenant': ROLES.ADMIN_TENANT,
  '/dashboard/superadmin':  ROLES.SUPERADMIN,
}

// Tipe membership dari JWT baru (Edge Function v7)
interface JwtMembership {
  tenant_id: string | null
  role:      string
  status:    string
}

// Helper: extract memberships + is_super_admin dari JWT payload
function extractMembershipsFromPayload(payload: Record<string, unknown>): {
  memberships:  JwtMembership[]
  isSuperAdmin: boolean
} {
  const raw = payload['memberships']
  const memberships: JwtMembership[] = Array.isArray(raw) ? (raw as JwtMembership[]) : []
  const isSuperAdmin = payload['is_super_admin'] === true
  return { memberships, isSuperAdmin }
}

// Helper: tentukan role utama dari memberships (first active)
// SA tidak ada di memberships — dideteksi via isSuperAdmin flag
function resolveRoleFromMemberships(memberships: JwtMembership[]): { role?: string; tenantId?: string } {
  if (memberships.length === 0) return {}
  const first = memberships[0]
  return {
    role:     first.role ?? undefined,
    tenantId: first.tenant_id ?? undefined,
  }
}

// Helper reusable: decode JWT claims dari session access_token
async function decodeJwtFromSession(supabase: ReturnType<typeof createServerClient>): Promise<{
  userId?: string
  isSuperAdmin: boolean
  memberships: JwtMembership[]
  role?: string
  tenantId?: string
  displayName?: string
}> {
  // Coba getClaims() fast path
  try {
    const claimsResult = await (supabase.auth as unknown as {
      getClaims: () => Promise<{ data: { claims: Record<string, unknown> } | null; error: unknown }>
    }).getClaims()

    if (!claimsResult.error && claimsResult.data?.claims) {
      const c         = claimsResult.data.claims
      const userId    = typeof c['sub'] === 'string' ? c['sub'] : undefined
      const umeta     = (typeof c['user_metadata'] === 'object' && c['user_metadata'] !== null)
                      ? c['user_metadata'] as Record<string, unknown> : {}
      const appMeta   = (typeof c['app_metadata'] === 'object' && c['app_metadata'] !== null)
                      ? c['app_metadata'] as Record<string, unknown> : {}
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
        role     = resolved.role
        tenantId = resolved.tenantId
      }
      return { userId, isSuperAdmin, memberships, role, tenantId, displayName }
    }
  } catch { /* fallback ke getSession */ }

  // Fallback: decode dari access_token JWT langsung
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
          role     = resolved.role
          tenantId = resolved.tenantId
        }
        return { userId, isSuperAdmin, memberships, role, tenantId, displayName }
      }
    } catch { /* abaikan */ }
  }

  return { isSuperAdmin: false, memberships: [] }
}

// Middleware Utama
export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = request.nextUrl

    // Guard 1 -- Route publik eksak langsung izinkan
    if (PUBLIC_PATHS.includes(pathname) && pathname !== '/login'
        && pathname !== '/sa/masuk' && pathname !== '/kelola/masuk') return NextResponse.next()

    // Guard 1B -- Pintu SA: cek apakah user sudah authenticated
    if (pathname === '/sa/masuk') {
      if (request.cookies.get('otp_pending')?.value === '1') {
        return NextResponse.next()
      }
      let saMasukResponse = NextResponse.next({ request })
      const supabaseSA = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              saMasukResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                saMasukResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      const { data: { user: saMasukUser } } = await supabaseSA.auth.getUser()
      if (saMasukUser) {
        const { role: saMasukRole } = await decodeJwtFromSession(supabaseSA)
        if (saMasukRole === ROLES.SUPERADMIN && ROLE_TO_DASHBOARD[ROLES.SUPERADMIN]) {
          return NextResponse.redirect(new URL(ROLE_TO_DASHBOARD[ROLES.SUPERADMIN], request.url))
        }
      }
      return saMasukResponse
    }

    // Guard 1B -- Pintu AT: cek apakah user sudah authenticated
    if (pathname === '/at/masuk') {
      if (request.cookies.get('otp_pending')?.value === '1') {
        return NextResponse.next()
      }
      let atMasukResponse = NextResponse.next({ request })
      const supabaseAT = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              atMasukResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                atMasukResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      const { data: { user: atMasukUser } } = await supabaseAT.auth.getUser()
      if (atMasukUser) {
        const { role: atMasukRole } = await decodeJwtFromSession(supabaseAT)
        if (atMasukRole === ROLES.ADMIN_TENANT && ROLE_TO_DASHBOARD[ROLES.ADMIN_TENANT]) {
          return NextResponse.redirect(new URL(ROLE_TO_DASHBOARD[ROLES.ADMIN_TENANT], request.url))
        }
      }
      return atMasukResponse
    }

    // Guard 1B -- /login khusus: cek apakah user sudah authenticated
    if (pathname === '/login') {
      if (request.cookies.get('otp_pending')?.value === '1') {
        return NextResponse.next()
      }

      let loginResponse = NextResponse.next({ request })
      const supabaseLogin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              loginResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                loginResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      const { data: { user: loginUser } } = await supabaseLogin.auth.getUser()
      if (loginUser) {
        const { role: loginRole } = await decodeJwtFromSession(supabaseLogin)
        if (loginRole === ROLES.VENDOR) return loginResponse
        if (loginRole && ROLE_TO_DASHBOARD[loginRole]) {
          return NextResponse.redirect(new URL(ROLE_TO_DASHBOARD[loginRole], request.url))
        }
      }
      return loginResponse
    }

    // Guard 2 -- Prefix publik: Next.js internal dan auth API
    if (pathname.startsWith('/_next/') || pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    // Guard 3 -- File statis berdasarkan ekstensi
    if (STATIC_EXTENSIONS.test(pathname)) return NextResponse.next()

    // Guard 4 -- Favicon
    if (pathname === '/favicon.ico') return NextResponse.next()

    // Guard 6 -- /api/superadmin/* + /api/admintenant/* + /api/config/* — inject auth headers
    // FIX: tanpa guard ini, requireSuperAdmin() di semua API route SA return 401
    // karena header x-is-super-admin tidak pernah di-set (hanya Guard 5 /dashboard yang set)
    // /api/config/* ditambahkan CASE SESI-27: route ini juga butuh requireSuperAdmin()
    if (
      pathname.startsWith('/api/superadmin/') ||
      pathname.startsWith('/api/admintenant/') ||
      pathname.startsWith('/api/config/')
    ) {
      const supabaseApi = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll() { /* API route — tidak set cookie */ },
          },
        }
      )

      const { userId, isSuperAdmin, memberships, role, tenantId, displayName } =
        await decodeJwtFromSession(supabaseApi)

      const apiHeaders = new Headers(request.headers)
      apiHeaders.delete('x-user-id')
      apiHeaders.delete('x-user-role')
      apiHeaders.delete('x-tenant-id')
      apiHeaders.delete('x-user-display-name')
      apiHeaders.delete('x-user-memberships')
      apiHeaders.delete('x-is-super-admin')

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

    // Guard 5 -- Proteksi route /dashboard
    if (pathname.startsWith('/dashboard')) {
      if (request.cookies.get('otp_pending')?.value === '1') {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      let response = NextResponse.next({ request })

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              response = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      let userRole: string | undefined
      let tenantId: string | undefined
      let userId:   string | undefined
      let displayName: string | undefined
      let vendorStatus: string | undefined
      let tokenRefreshNeeded = false
      let memberships:  JwtMembership[] = []
      let isSuperAdmin: boolean         = false

      // Coba getClaims() dulu -- fast path jika JWT valid
      try {
        const claimsResult = await (supabase.auth as unknown as {
          getClaims: () => Promise<{ data: { claims: Record<string, unknown> } | null; error: unknown }>
        }).getClaims()

        if (!claimsResult.error && claimsResult.data?.claims) {
          const c       = claimsResult.data.claims
          const appMeta = (typeof c['app_metadata'] === 'object' && c['app_metadata'] !== null)
                        ? c['app_metadata'] as Record<string, unknown> : {}
          const umeta   = (typeof c['user_metadata'] === 'object' && c['user_metadata'] !== null)
                        ? c['user_metadata'] as Record<string, unknown> : {}

          userId      = typeof c['sub'] === 'string' ? c['sub'] : undefined
          displayName = typeof appMeta['nama']  === 'string' ? appMeta['nama']
                      : typeof umeta['nama']    === 'string' ? umeta['nama']
                      : typeof c['email']       === 'string' ? c['email'] : userId
          const extracted2 = extractMembershipsFromPayload(c)
          memberships  = extracted2.memberships
          isSuperAdmin = extracted2.isSuperAdmin

          if (isSuperAdmin) {
            userRole = ROLES.SUPERADMIN
          } else if (memberships.length > 0) {
            const resolved = resolveRoleFromMemberships(memberships)
            userRole  = resolved.role
            tenantId  = resolved.tenantId ?? tenantId
          }

          vendorStatus = typeof c['vendor_status']      === 'string' ? c['vendor_status']
                       : typeof appMeta['vendor_status'] === 'string' ? appMeta['vendor_status'] : undefined
        }
      } catch { /* getClaims() belum tersedia atau RS256 belum aktif -- lanjut ke fallback */ }

      // Fallback ke getUser() jika getClaims() tidak berhasil
      if (!userRole || !userId) {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          return NextResponse.redirect(new URL('/login', request.url))
        }

        userId      = user.id
        displayName = typeof user.user_metadata?.['nama'] === 'string'
                    ? user.user_metadata['nama']
                    : user.email ?? user.id
        tokenRefreshNeeded = true

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          try {
            const parts = session.access_token.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

              const extracted2 = extractMembershipsFromPayload(payload)
              memberships  = extracted2.memberships
              isSuperAdmin = extracted2.isSuperAdmin

              if (isSuperAdmin) {
                userRole = ROLES.SUPERADMIN
              } else if (memberships.length > 0) {
                const resolved = resolveRoleFromMemberships(memberships)
                userRole = resolved.role
                tenantId = resolved.tenantId ?? ''
              }

              if (!vendorStatus && typeof payload['vendor_status'] === 'string') {
                vendorStatus = payload['vendor_status']
              }
            }
          } catch { /* abaikan */ }
        }
      }

      if (!userRole || !userId) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Guard B1-04: Vendor blocked status check
      if (userRole === ROLES.VENDOR && pathname.startsWith('/dashboard/vendor')) {
        if (vendorStatus && !(VENDOR_LOGIN_ALLOWED as string[]).includes(vendorStatus.toLowerCase())) {
          return NextResponse.redirect(new URL('/pending-approval', request.url))
        }
      }

      // Propagasi user data ke Server Components via request headers
      const requestHeaders = new Headers(request.headers)
      requestHeaders.delete('x-user-id')
      requestHeaders.delete('x-user-role')
      requestHeaders.delete('x-tenant-id')
      requestHeaders.delete('x-user-display-name')
      requestHeaders.delete('x-vendor-status')
      requestHeaders.delete('x-user-memberships')
      requestHeaders.delete('x-is-super-admin')

      requestHeaders.set('x-user-id',           userId)
      requestHeaders.set('x-user-role',          userRole)
      requestHeaders.set('x-tenant-id',          tenantId ?? '')
      requestHeaders.set('x-user-display-name',  displayName ?? userId)
      if (vendorStatus) {
        requestHeaders.set('x-vendor-status', vendorStatus)
      }
      requestHeaders.set('x-user-memberships', memberships.length > 0 ? JSON.stringify(memberships) : '')
      requestHeaders.set('x-is-super-admin', String(isSuperAdmin))

      const enrichedResponse = NextResponse.next({ request: { headers: requestHeaders } })
      if (tokenRefreshNeeded) {
        response.headers.getSetCookie().forEach(cookie => {
          enrichedResponse.headers.append('Set-Cookie', cookie)
        })
      }
      response = enrichedResponse

      // Cek session timeout
      const timeoutMenit = (() => {
        const raw = request.cookies.get('session_timeout_minutes')?.value
        const val = raw ? parseInt(raw, 10) : NaN
        return !isNaN(val) && val > 0 ? val : null
      })()

      if (timeoutMenit !== null) {
        const sekarang      = Date.now()
        const lastActiveStr = request.cookies.get('session_last_active')?.value
        if (lastActiveStr) {
          const lastActiveMs = parseInt(lastActiveStr, 10)
          const timeoutMs    = timeoutMenit * 60 * 1000
          if (!isNaN(lastActiveMs) && sekarang - lastActiveMs > timeoutMs) {
            return NextResponse.redirect(new URL('/login?reason=timeout', request.url))
          }
        }
      }

      // Cek role sesuai dashboard path
      let requiredRole: string | null = null
      for (const [dashboardPath, role] of Object.entries(DASHBOARD_ROLE_MAP)) {
        if (pathname.startsWith(dashboardPath)) {
          requiredRole = role
          break
        }
      }

      if (requiredRole === null) {
        if (timeoutMenit !== null) {
          response.cookies.set('session_last_active', String(Date.now()), {
            path: '/', maxAge: timeoutMenit * 60, sameSite: 'strict', httpOnly: true,
          })
        }
        return response
      }

      if (userRole === requiredRole) {
        if (timeoutMenit !== null) {
          response.cookies.set('session_last_active', String(Date.now()), {
            path: '/', maxAge: timeoutMenit * 60, sameSite: 'strict', httpOnly: true,
          })
        }
        return response
      }

      const redirectPath = ROLE_TO_DASHBOARD[userRole]
      if (redirectPath) {
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }

      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()

  } catch {
    return NextResponse.next()
  }
}

// Matcher Config
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
