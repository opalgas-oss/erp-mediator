// middleware.ts — letaknya di ROOT folder, sejajar dengan folder app/
// Berjalan di Edge Runtime — tidak boleh import library Node.js
//
// PERUBAHAN dari versi Firebase:
//   - Ganti decode base64 JWT → full crypto verify via Supabase SSR getUser()
//   - createServerClient dari @supabase/ssr membaca session cookie Supabase otomatis
//   - Role dibaca dari user.app_metadata.app_role (diisi inject-custom-claims hook)
//   - Logika routing DASHBOARD_ROLE_MAP + ROLE_REDIRECT: TIDAK BERUBAH
//   - Logika session timeout: TIDAK BERUBAH

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
    // EXCEPTION: /login perlu cek auth — user yang sudah login harus di-redirect ke dashboard
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
        // User sudah authenticated — baca role dan redirect ke dashboard yang sesuai
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
        // VENDOR: jangan auto-redirect dari /login meski sudah authenticated
        // Status PENDING/REVIEW dicek oleh login flow (muatDataUser) + vendor layout
        // Tanpa ini: vendor PENDING yang punya session aktif langsung masuk /dashboard/vendor
        if (loginRole === ROLES.VENDOR) {
          return loginResponse
        }

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
      // Setup response yang bisa di-mutasi cookie-nya (untuk refresh token Supabase)
      let response = NextResponse.next({ request })

      // createServerClient dari @supabase/ssr — full crypto verify, bukan decode base64
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              // Propagate cookie refresh ke request dan response
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

      // Tidak ada user yang valid → redirect ke login
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Role dibaca dari app_metadata (diisi saat createUser via Admin API)
      // Fallback: baca dari JWT payload (diisi oleh inject-custom-claims Edge Function)
      // Dua sumber ini diperlukan karena user lama mungkin tidak punya app_metadata.app_role
      let userRole = user.app_metadata?.['app_role'] as string | undefined

      if (!userRole) {
        // Fallback: baca access_token via getSession() untuk ambil custom claims dari JWT
        // getSession() membaca cookie tanpa network call — aman dipakai setelah getUser() verify
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          try {
            const parts = session.access_token.split('.')
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
              userRole = payload['app_role'] as string | undefined
            }
          } catch {
            // JWT tidak bisa di-decode — abaikan
          }
        }
      }

      if (!userRole) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // ── Cek session timeout ─────────────────────────────────────────────────
      // Baca session_timeout_minutes dari cookie — diembed saat login berhasil
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

      // Tentukan role yang dibutuhkan berdasarkan path dashboard
      let requiredRole: string | null = null
      for (const [dashboardPath, role] of Object.entries(DASHBOARD_ROLE_MAP)) {
        if (pathname.startsWith(dashboardPath)) {
          requiredRole = role
          break
        }
      }

      // Path /dashboard tidak dikenali → izinkan
      if (requiredRole === null) {
        if (timeoutMenit !== null) {
          response.cookies.set('session_last_active', String(Date.now()), {
            path: '/', maxAge: timeoutMenit * 60, sameSite: 'strict', httpOnly: true,
          })
        }
        return response
      }

      // Role cocok → izinkan, perbarui session_last_active
      if (userRole === requiredRole) {
        if (timeoutMenit !== null) {
          response.cookies.set('session_last_active', String(Date.now()), {
            path: '/', maxAge: timeoutMenit * 60, sameSite: 'strict', httpOnly: true,
          })
        }
        return response
      }

      // Role tidak cocok → redirect ke dashboard yang sesuai
      const redirectPath = ROLE_REDIRECT[userRole]
      if (redirectPath) {
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }

      // Role tidak dikenal → redirect ke login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Semua path lain → izinkan
    return NextResponse.next()

  } catch {
    // Middleware crash → tetap izinkan agar aplikasi tidak lumpuh
    return NextResponse.next()
  }
}

// ─── Matcher Config ───────────────────────────────────────────────────────────
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}