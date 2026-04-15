// middleware.ts â€” letaknya di ROOT folder, sejajar dengan folder app/
// Berjalan di Edge Runtime â€” tidak boleh import library Node.js
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// â”€â”€â”€ Konstanta Route Publik â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Route ini langsung diizinkan tanpa perlu autentikasi
const PUBLIC_PATHS: string[] = [
  '/',
  '/login',
  '/register',
  '/pending-approval',
  '/setup',
]

// Ekstensi file statis yang langsung diizinkan
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|ico|css|js|webp|woff|woff2|ttf)$/i

// â”€â”€â”€ Pemetaan Dashboard per Role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Tipe Payload JWT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface JwtPayload {
  role?: string
  // Durasi timeout sesi dalam menit â€” diembed ke claims saat login berhasil
  // Kalau field ini tidak ada di claims: timeout check dilewati (tidak error)
  session_timeout_minutes?: number
  [key: string]: unknown
}

// â”€â”€â”€ Decode JWT (tanpa verifikasi kriptografi) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Verifikasi penuh dilakukan di API routes server-side.
// Edge Runtime hanya butuh tahu role untuk routing â€” cukup decode base64.
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Bagian tengah (index 1) adalah payload, dikodekan dengan base64url
    const base64 = parts[1]
      .replace(/-/g, '+') // base64url â†’ base64 standar
      .replace(/_/g, '/')

    // Padding agar panjang base64 kelipatan 4
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

    const decoded = atob(padded) // tersedia di Edge Runtime
    return JSON.parse(decoded) as JwtPayload
  } catch {
    // Decode gagal â€” kembalikan null agar middleware redirect ke /login
    return null
  }
}

// â”€â”€â”€ Middleware Utama â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function middleware(request: NextRequest): NextResponse {
  try {
    const { pathname } = request.nextUrl

    // Guard 1 â€” Route publik eksak â†’ langsung izinkan
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next()
    }

    // Guard 2 â€” Prefix publik: Next.js internal dan auth API
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/auth/')
    ) {
      return NextResponse.next()
    }

    // Guard 3 â€” File statis berdasarkan ekstensi
    if (STATIC_EXTENSIONS.test(pathname)) {
      return NextResponse.next()
    }

    // Guard 4 â€” Route /favicon.ico
    if (pathname === '/favicon.ico') {
      return NextResponse.next()
    }

    // Guard 5 â€” Proteksi route /dashboard
    if (pathname.startsWith('/dashboard')) {
      // Ambil session cookie (JWT)
      const sessionToken = request.cookies.get('session')?.value

      // Tidak ada session â†’ redirect ke login
      if (!sessionToken) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Decode payload JWT tanpa verifikasi kriptografi
      const payload = decodeJwtPayload(sessionToken)

      // Decode gagal atau tidak ada field role â†’ redirect ke login
      if (!payload || typeof payload.role !== 'string') {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // â”€â”€ Cek session timeout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Baca session_timeout_minutes dari JWT claims â€” diembed saat login berhasil
      // Middleware berjalan di Edge Runtime: tidak bisa import lib/policy.ts
      // Kalau field tidak ada di claims â†’ skip check tanpa error
      const timeoutMenit =
        typeof payload.session_timeout_minutes === 'number' &&
        payload.session_timeout_minutes > 0
          ? payload.session_timeout_minutes
          : null

      if (timeoutMenit !== null) {
        const sekarang      = Date.now()
        const lastActiveStr = request.cookies.get('session_last_active')?.value

        if (lastActiveStr) {
          const lastActiveMs = parseInt(lastActiveStr, 10)
          const timeoutMs    = timeoutMenit * 60 * 1000

          // Sesi sudah melewati batas inaktif â†’ redirect ke login dengan alasan timeout
          if (!isNaN(lastActiveMs) && sekarang - lastActiveMs > timeoutMs) {
            return NextResponse.redirect(new URL('/login?reason=timeout', request.url))
          }
        }
        // Cookie belum ada (request pertama) atau belum timeout â†’ lanjut
        // session_last_active diperbarui di respons valid di bawah
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

      // Path /dashboard tidak dikenali â†’ langsung izinkan (handled di page level)
      if (requiredRole === null) {
        // Perbarui session_last_active jika timeout dikonfigurasi
        if (timeoutMenit !== null) {
          const res = NextResponse.next()
          res.cookies.set('session_last_active', String(Date.now()), {
            path:     '/',
            maxAge:   timeoutMenit * 60,
            sameSite: 'strict',
            httpOnly: true,
          })
          return res
        }
        return NextResponse.next()
      }

      // Role cocok â†’ izinkan akses, perbarui session_last_active
      if (userRole === requiredRole) {
        if (timeoutMenit !== null) {
          const res = NextResponse.next()
          res.cookies.set('session_last_active', String(Date.now()), {
            path:     '/',
            maxAge:   timeoutMenit * 60,
            sameSite: 'strict',
            httpOnly: true,
          })
          return res
        }
        return NextResponse.next()
      }

      // Role tidak cocok â†’ redirect ke dashboard yang sesuai role user
      const redirectPath = ROLE_REDIRECT[userRole]
      if (redirectPath) {
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }

      // Role tidak dikenali sama sekali â†’ redirect ke login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Semua path lain yang tidak masuk kategori di atas â†’ izinkan
    return NextResponse.next()
  } catch {
    // Middleware crash â†’ tetap izinkan request agar aplikasi tidak lumpuh total
    return NextResponse.next()
  }
}

// â”€â”€â”€ Matcher Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Jalankan middleware di semua path kecuali file statis Next.js dan gambar
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

