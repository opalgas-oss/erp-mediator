// middleware.ts — letaknya di ROOT folder, sejajar dengan folder app/
// Berjalan di Edge Runtime — tidak boleh import library Node.js
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Konstanta Route Publik ────────────────────────────────────────────────
// Route ini langsung diizinkan tanpa perlu autentikasi
const PUBLIC_PATHS: string[] = [
  '/',
  '/login',
  '/register',
  '/pending-approval',
]

// Ekstensi file statis yang langsung diizinkan
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|ico|css|js|webp|woff|woff2|ttf)$/i

// ─── Pemetaan Dashboard per Role ──────────────────────────────────────────
// Urutan penting: route yang lebih spesifik ditulis lebih dulu
const DASHBOARD_ROLE_MAP: Record<string, string> = {
  '/dashboard/customer':   'CUSTOMER',
  '/dashboard/vendor':     'VENDOR',
  '/dashboard/admin':      'ADMIN_TENANT',
  '/dashboard/superadmin': 'SUPERADMIN',
}

// Redirect tujuan berdasarkan role user
const ROLE_REDIRECT: Record<string, string> = {
  CUSTOMER:     '/dashboard/customer',
  VENDOR:       '/dashboard/vendor',
  ADMIN_TENANT: '/dashboard/admin',
  SUPERADMIN:   '/dashboard/superadmin',
}

// ─── Tipe Payload JWT ────────────────────────────────────────────────────
interface JwtPayload {
  role?: string
  [key: string]: unknown
}

// ─── Decode JWT (tanpa verifikasi kriptografi) ────────────────────────────
// Verifikasi penuh dilakukan di API routes server-side.
// Edge Runtime hanya butuh tahu role untuk routing — cukup decode base64.
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Bagian tengah (index 1) adalah payload, dikodekan dengan base64url
    const base64 = parts[1]
      .replace(/-/g, '+') // base64url → base64 standar
      .replace(/_/g, '/')

    // Padding agar panjang base64 kelipatan 4
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

    const decoded = atob(padded) // tersedia di Edge Runtime
    return JSON.parse(decoded) as JwtPayload
  } catch {
    // Decode gagal — kembalikan null agar middleware redirect ke /login
    return null
  }
}

// ─── Middleware Utama ─────────────────────────────────────────────────────
export function middleware(request: NextRequest): NextResponse {
  try {
    const { pathname } = request.nextUrl

    // Guard 1 — Route publik eksak → langsung izinkan
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next()
    }

    // Guard 2 — Prefix publik: Next.js internal dan auth API
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/auth/')
    ) {
      return NextResponse.next()
    }

    // Guard 3 — File statis berdasarkan ekstensi
    if (STATIC_EXTENSIONS.test(pathname)) {
      return NextResponse.next()
    }

    // Guard 4 — Route /favicon.ico
    if (pathname === '/favicon.ico') {
      return NextResponse.next()
    }

    // Guard 5 — Proteksi route /dashboard
    if (pathname.startsWith('/dashboard')) {
      // Ambil session cookie (JWT)
      const sessionToken = request.cookies.get('session')?.value

      // Tidak ada session → redirect ke login
      if (!sessionToken) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Decode payload JWT tanpa verifikasi kriptografi
      const payload = decodeJwtPayload(sessionToken)

      // Decode gagal atau tidak ada field role → redirect ke login
      if (!payload || typeof payload.role !== 'string') {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const userRole = payload.role

      // Tentukan role yang dibutuhkan berdasarkan path dashboard
      let requiredRole: string | null = null
      for (const [dashboardPath, role] of Object.entries(DASHBOARD_ROLE_MAP)) {
        if (pathname.startsWith(dashboardPath)) {
          requiredRole = role
          break
        }
      }

      // Path /dashboard tidak dikenali → langsung izinkan (handled di page level)
      if (requiredRole === null) {
        return NextResponse.next()
      }

      // Role cocok → izinkan akses
      if (userRole === requiredRole) {
        return NextResponse.next()
      }

      // Role tidak cocok → redirect ke dashboard yang sesuai role user
      const redirectPath = ROLE_REDIRECT[userRole]
      if (redirectPath) {
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }

      // Role tidak dikenali sama sekali → redirect ke login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Semua path lain yang tidak masuk kategori di atas → izinkan
    return NextResponse.next()
  } catch {
    // Middleware crash → tetap izinkan request agar aplikasi tidak lumpuh total
    return NextResponse.next()
  }
}

// ─── Matcher Config ───────────────────────────────────────────────────────
// Jalankan middleware di semua path kecuali file statis Next.js dan gambar
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
