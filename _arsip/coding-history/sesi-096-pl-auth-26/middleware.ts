// middleware.ts — ARSIP SESI #096 (sebelum PL-AUTH-26)
// Snapshot diambil: 4 Mei 2026 — sebelum tambah ekstrak memberships[] + is_super_admin
// ─────────────────────────────────────────────────────────────────────────────
// middleware.ts — letaknya di ROOT folder, sejajar dengan folder app/
// Berjalan di Edge Runtime — tidak boleh import library Node.js
//
// OPTIMASI Sesi #075 — getClaims() fast path:
//   Guard 5 sekarang pakai getClaims() DULU sebelum getUser().
//   getClaims() memverifikasi JWT lokal via cached JWKS (tidak ada network call ke Supabase Auth).
//   Jika JWT valid: ~1ms vs getUser() ~150-300ms — hemat ~150-300ms per setiap request dashboard.
//   Jika JWT expired/invalid: fallback otomatis ke getUser() untuk refresh.
//   SYARAT aktif: Supabase Dashboard → Authentication → JWT Signing Key → RS256
//   Sebelum RS256 diaktifkan: getClaims() return error → fallback ke getUser() (backward compat).
//
// PERUBAHAN Sesi #064 (fix double getUser):
//   Guard 5: setelah verify berhasil, set x-user-* di request headers
//   verifyJWT() di layout membaca header → skip getUser() ke-2
//
// PERUBAHAN dari versi Firebase:
//   - Ganti decode base64 JWT → full crypto verify via Supabase SSR
//   - Role dibaca dari user.app_metadata.app_role (diisi custom_access_token_hook)

import { createServerClient } from '@supabase/ssr'
import { NextResponse }        from 'next/server'
import type { NextRequest }    from 'next/server'
import { ROLES }               from '@/lib/constants'

// ─── Konstanta Route Publik ───────────────────────────────────────────────────
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

// ─── Pemetaan Dashboard per Role ─────────────────────────────────────────────
const DASHBOARD_ROLE_MAP: Record<string, string> = {
  '/dashboard/customer':   ROLES.CUSTOMER,
  '/dashboard/vendor':     ROLES.VENDOR,
  '/dashboard/admin':      ROLES.ADMIN_TENANT,
  '/dashboard/superadmin': ROLES.SUPERADMIN,
}

const ROLE_REDIRECT: Record<string, string> = {
  [ROLES.CUSTOMER]:     '/dashboard/customer',
  [ROLES.VENDOR]:       '/dashboard/vendor',
  [ROLES.ADMIN_TENANT]: '/dashboard/admin',
  [ROLES.SUPERADMIN]:   '/dashboard/superadmin',
}

// ─── Helper: extract role + tenantId dari claims/user ────────────────────────
function extractRoleFromAppMeta(appMeta: Record<string, unknown>): { role?: string; tenantId?: string } {
  return {
    role:     typeof appMeta['app_role']  === 'string' ? appMeta['app_role']  : undefined,
    tenantId: typeof appMeta['tenant_id'] === 'string' ? appMeta['tenant_id'] : undefined,
  }
}

// ─── Middleware Utama ─────────────────────────────────────────────────────────
export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    const { pathname } = request.nextUrl

    // Guard 1 — Route publik eksak → langsung izinkan
    if (PUBLIC_PATHS.includes(pathname) && pathname !== '/login') return NextResponse.next()

    // Guard 1B — /login khusus: cek apakah user sudah authenticated
    if (pathname === '/login') {
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
        if (loginRole && ROLE_REDIRECT[loginRole]) {
          return NextResponse.redirect(new URL(ROLE_REDIRECT[loginRole], request.url))
        }
      }
      return loginResponse
    }

    // Guard 2 — Prefix publik: Next.js internal dan auth API
    if (pathname.startsWith('/_next/') || pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    // Guard 3 — File statis berdasarkan ekstensi
    if (STATIC_EXTENSIONS.test(pathname)) return NextResponse.next()

    // Guard 4 — Favicon
    if (pathname === '/favicon.ico') return NextResponse.next()

    // Guard 5 — Proteksi route /dashboard
    if (pathname.startsWith('/dashboard')) {
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

      // ── OPTIMASI #075: getClaims() fast path (tidak ada network call) ─────
      // getClaims() aktif setelah RS256 diaktifkan di Supabase Dashboard.
      // Sebelum RS256: getClaims() return error → fallback ke getUser() (backward compat).
      //
      // OPTIMASI #077 (Vendor RSC fix): tambah ekstrak vendor_status dari claims.
      // Edge Function v5 inject vendor_status sebagai top-level claim.
      // Vendor layout pakai value ini untuk skip query DB user_profiles.status.
      let userRole: string | undefined
      let tenantId: string | undefined
      let userId:   string | undefined
      let displayName: string | undefined
      let vendorStatus: string | undefined
      let tokenRefreshNeeded = false

      // Coba getClaims() dulu — fast path jika JWT valid
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
          // vendor_status: top-level claim dulu (Edge Function v5), fallback ke app_metadata
          vendorStatus = typeof c['vendor_status']      === 'string' ? c['vendor_status']
                       : typeof appMeta['vendor_status'] === 'string' ? appMeta['vendor_status'] : undefined
        }
      } catch { /* getClaims() belum tersedia atau RS256 belum aktif — lanjut ke fallback */ }

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

        // Fallback decode JWT jika app_metadata kosong
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
              }
            } catch { /* abaikan */ }
          }
        }
      }

      if (!userRole || !userId) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // ── Propagasi user data ke Server Components via request headers ──────
      const requestHeaders = new Headers(request.headers)
      requestHeaders.delete('x-user-id')
      requestHeaders.delete('x-user-role')
      requestHeaders.delete('x-tenant-id')
      requestHeaders.delete('x-user-display-name')
      requestHeaders.delete('x-vendor-status')
      requestHeaders.set('x-user-id',           userId)
      requestHeaders.set('x-user-role',          userRole)
      requestHeaders.set('x-tenant-id',          tenantId ?? '')
      requestHeaders.set('x-user-display-name',  displayName ?? userId)
      // x-vendor-status: hanya di-set jika ada di JWT (skip header kalau undefined → vendor layout fallback DB)
      if (vendorStatus) {
        requestHeaders.set('x-vendor-status', vendorStatus)
      }

      const enrichedResponse = NextResponse.next({ request: { headers: requestHeaders } })
      if (tokenRefreshNeeded) {
        response.headers.getSetCookie().forEach(cookie => {
          enrichedResponse.headers.append('Set-Cookie', cookie)
        })
      }
      response = enrichedResponse

      // ── Cek session timeout ───────────────────────────────────────────────
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

      // ── Cek role sesuai dashboard path ────────────────────────────────────
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

      const redirectPath = ROLE_REDIRECT[userRole]
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

// ─── Matcher Config ───────────────────────────────────────────────────────────
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
