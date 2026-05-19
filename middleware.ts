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
]

const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|ico|css|js|webp|woff|woff2|ttf)$/i

// Pemetaan Dashboard per Role
const DASHBOARD_ROLE_MAP: Record<string, string> = {
  '/dashboard/customer':   ROLES.CUSTOMER,
  '/dashboard/vendor':     ROLES.VENDOR,
  '/dashboard/admin':      ROLES.ADMIN_TENANT,
  '/dashboard/superadmin': ROLES.SUPERADMIN,
}

// Tipe membership dari JWT baru (Edge Function v7)
interface JwtMembership {
  tenant_id: string | null
  role:      string
  status:    string
}

// Helper: extract role + tenantId dari claims/user
function extractRoleFromAppMeta(appMeta: Record<string, unknown>): { role?: string; tenantId?: string } {
  return {
    role:     typeof appMeta['app_role']  === 'string' ? appMeta['app_role']  : undefined,
    tenantId: typeof appMeta['tenant_id'] === 'string' ? appMeta['tenant_id'] : undefined,
  }
}

// Helper: extract memberships + is_super_admin dari JWT payload (S#096)
function extractMembershipsFromPayload(payload: Record<string, unknown>): {
  memberships:  JwtMembership[]
  isSuperAdmin: boolean
} {
  const raw = payload['memberships']
  const memberships: JwtMembership[] = Array.isArray(raw) ? (raw as JwtMembership[]) : []
  const isSuperAdmin = payload['is_super_admin'] === true
  return { memberships, isSuperAdmin }
}

// Middleware Utama
export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = request.nextUrl

    // Guard 1 -- Route publik eksak langsung izinkan
    if (PUBLIC_PATHS.includes(pathname) && pathname !== '/login') return NextResponse.next()

    // Guard 1B -- /login khusus: cek apakah user sudah authenticated
    if (pathname === '/login') {
      // FIX S#183e: jika otp_pending ada, user SA sedang dalam flow OTP
      // Jangan redirect ke dashboard — biarkan /login render OTP screen
      // Tanpa ini: authenticated user di /login → redirect dashboard → otp_pending guard → loop
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
        let loginRole = loginUser.app_metadata?.['app_role'] as string | undefined
        if (!loginRole) {
          const { data: { session: loginSession } } = await supabaseLogin.auth.getSession()
          if (loginSession?.access_token) {
            try {
              const parts = loginSession.access_token.split('.')
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
                loginRole = payload['app_role'] as string | undefined
              }
            } catch { /* abaikan */ }
          }
        }
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

    // Guard 5 -- Proteksi route /dashboard
    if (pathname.startsWith('/dashboard')) {
      // FIX S#183e: otp_pending guard — SA dalam proses OTP belum selesai
      // loginUnifiedAction set cookie ini untuk SA OTP=required setelah auth berhasil
      // Supabase JWT masih valid tapi OTP belum diverifikasi → blokir akses dashboard
      // selesaiLogin() (setelah OTP verified) hapus cookie ini via document.cookie
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

          const extracted = extractRoleFromAppMeta(appMeta)
          userRole    = extracted.role
          tenantId    = extracted.tenantId
          userId      = typeof c['sub'] === 'string' ? c['sub'] : undefined
          displayName = typeof appMeta['nama']  === 'string' ? appMeta['nama']
                      : typeof umeta['nama']    === 'string' ? umeta['nama']
                      : typeof c['email']       === 'string' ? c['email'] : userId
          vendorStatus = typeof c['vendor_status']      === 'string' ? c['vendor_status']
                       : typeof appMeta['vendor_status'] === 'string' ? appMeta['vendor_status'] : undefined

          const extracted2 = extractMembershipsFromPayload(c)
          memberships  = extracted2.memberships
          isSuperAdmin = extracted2.isSuperAdmin

          if (isSuperAdmin) {
            userRole = ROLES.SUPERADMIN
          } else if (!userRole && memberships.length > 0) {
            userRole = memberships[0].role
            if (!tenantId && memberships[0].tenant_id) {
              tenantId = memberships[0].tenant_id
            }
          }
        }
      } catch { /* getClaims() belum tersedia atau RS256 belum aktif -- lanjut ke fallback */ }

      // Fallback ke getUser() jika getClaims() tidak berhasil
      if (!userRole || !userId) {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          return NextResponse.redirect(new URL('/login', request.url))
        }

        userId      = user.id
        userRole    = user.app_metadata?.['app_role'] as string | undefined
        tenantId    = user.app_metadata?.['tenant_id'] as string | undefined
        displayName = typeof user.user_metadata?.['nama'] === 'string'
                    ? user.user_metadata['nama']
                    : user.email ?? user.id
        vendorStatus = typeof user.app_metadata?.['vendor_status'] === 'string'
                     ? user.app_metadata['vendor_status'] : undefined
        tokenRefreshNeeded = true

        if (!userRole || !vendorStatus) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            try {
              const parts = session.access_token.split('.')
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

                if (!userRole     && typeof payload['app_role']      === 'string') userRole     = payload['app_role']
                if (!tenantId     && typeof payload['tenant_id']     === 'string') tenantId     = payload['tenant_id']
                if (!vendorStatus && typeof payload['vendor_status'] === 'string') vendorStatus = payload['vendor_status']

                const extracted2 = extractMembershipsFromPayload(payload)
                memberships  = extracted2.memberships
                isSuperAdmin = extracted2.isSuperAdmin

                if (isSuperAdmin) {
                  userRole = ROLES.SUPERADMIN
                } else if (!userRole && memberships.length > 0) {
                  userRole = memberships[0].role
                  if (!tenantId && memberships[0].tenant_id) {
                    tenantId = memberships[0].tenant_id
                  }
                }
              }
            } catch { /* abaikan */ }
          }
        }
      }

      if (!userRole || !userId) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Guard B1-04: Vendor blocked status check
      if (userRole === ROLES.VENDOR && pathname.startsWith('/dashboard/vendor')) {
        if (vendorStatus && !(VENDOR_LOGIN_ALLOWED as string[]).includes(vendorStatus.toUpperCase())) {
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
