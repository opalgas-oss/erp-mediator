// middleware.ts — letaknya di ROOT folder, sejajar dengan folder app/
// Berjalan di Edge Runtime — tidak boleh import library Node.js
//
// PERUBAHAN dari versi Firebase:
//   - Ganti decode base64 JWT → full crypto verify via Supabase SSR getUser()
//   - createServerClient dari @supabase/ssr membaca session cookie Supabase otomatis
//   - Role dibaca dari user.app_metadata.app_role (diisi inject-custom-claims hook)
//   - Logika routing DASHBOARD_ROLE_MAP + ROLE_REDIRECT: TIDAK BERUBAH
//   - Logika session timeout: TIDAK BERUBAH
//
// PERUBAHAN Sesi #064 (fix double getUser):
//   - Guard 5: setelah getUser() berhasil, set x-user-* di request headers
//   - verifyJWT() di layout membaca header → skip getUser() ke-2
//   - Set-Cookie dari token refresh di-copy ke enriched response via getSetCookie()
//   - Pendekatan ini aman untuk GET dan POST (server action) request

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

// ─── Pemetaan Dashboard per Role — TIDAK BERUBAH ─────────────────────────────
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
      // Setup response awal — dipakai setAll untuk cookie refresh (pola original)
      let response = NextResponse.next({ request })

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              // Pola original dipertahankan — aman untuk GET dan POST (server action)
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
              response = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      // Full crypto verify — getUser() memvalidasi JWT ke Supabase Auth server
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Role + tenantId dari app_metadata, fallback ke JWT payload
      let userRole = user.app_metadata?.['app_role'] as string | undefined
      let tenantId = user.app_metadata?.['tenant_id'] as string | undefined

      if (!userRole) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          try {
            const parts = session.access_token.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
              userRole = payload['app_role'] as string | undefined
              if (!tenantId) tenantId = payload['tenant_id'] as string | undefined
            }
          } catch { /* abaikan */ }
        }
      }

      if (!userRole) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // ── Propagasi user data ke Server Components via request headers ─────────
      // verifyJWT() baca header ini → skip getUser() ke-2 → hemat ~100-150ms
      // Security: strip header dari client sebelum set
      const displayName = typeof user.user_metadata?.['nama'] === 'string'
        ? user.user_metadata['nama']
        : user.email ?? user.id

      const requestHeaders = new Headers(request.headers)
      requestHeaders.delete('x-user-id')
      requestHeaders.delete('x-user-role')
      requestHeaders.delete('x-tenant-id')
      requestHeaders.delete('x-user-display-name')
      requestHeaders.set('x-user-id',           user.id)
      requestHeaders.set('x-user-role',          userRole)
      requestHeaders.set('x-tenant-id',          tenantId ?? '')
      requestHeaders.set('x-user-display-name',  displayName)

      // Buat enriched response dengan request headers baru
      // Copy Set-Cookie dari response original (token refresh) — aman via getSetCookie()
      const enrichedResponse = NextResponse.next({ request: { headers: requestHeaders } })
      response.headers.getSetCookie().forEach(cookie => {
        enrichedResponse.headers.append('Set-Cookie', cookie)
      })
      response = enrichedResponse

      // ── Cek session timeout ─────────────────────────────────────────────────
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

      // Tentukan role yang dibutuhkan berdasarkan path
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
