// lib/auth-server.ts
// Fungsi autentikasi server-side — HANYA untuk Server Component dan API Route
// JANGAN diimpor di Client Component atau middleware Edge Runtime
//
// PERUBAHAN dari versi Firebase:
//   - verifyJWT() sekarang pakai Supabase Auth (bukan Firebase Admin verifyIdToken)
//   - Dibungkus react.cache() untuk eliminasi delay 1.97 detik dari duplikasi panggilan
//   - Role dibaca dari app_metadata JWT (diisi oleh Edge Function inject-custom-claims)
//
// PERUBAHAN Sesi #064 (fix double getUser):
//   - verifyJWT() baca x-user-* headers dari middleware dulu
//   - Jika header tersedia → skip getUser() ke Supabase (~100-150ms hemat)
//   - Fallback ke getUser() tetap ada untuk request non-dashboard
//
// PERUBAHAN 8 Juni 2026 CASE SESI-12 (AUTH Normalized — keputusan Philips):
//   - requireSuperAdmin() ganti cek role string → cek isSuperAdmin flag dari JWT
//   - isSuperAdmin dibaca dari header x-is-super-admin (diset middleware)
//   - Ref: KEPUTUSAN_AUTH_NORMALIZED_v1.md
//
// PERUBAHAN S#292 — tambah requireSuperAdminCookie():
//   requireSuperAdmin() bergantung pada header x-is-super-admin dari middleware.
//   Header ini TIDAK tersedia untuk client-side fetch (browser → API route langsung).
//   requireSuperAdminCookie() verifikasi via cookie Supabase + app_role JWT claim.
//   KAPAN PAKAI:
//   - requireSuperAdmin()       → Server Component, Server Action, API route dari server
//   - requireSuperAdminCookie() → API route yang dipanggil fetch() dari browser (client component)

import 'server-only'
import { cache }    from 'react'
import { cookies, headers } from 'next/headers'
import { createServerClient }         from '@supabase/ssr'
import { NextResponse }               from 'next/server'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  uid:           string
  role:          string
  tenantId:      string
  displayName:   string
  isSuperAdmin:  boolean
  memberships:   Array<{ tenant_id: string | null; role: string; status: string }>
  vendorStatus?: string
}

export type RequireSuperAdminResult =
  | { ok: true;  uid: string }
  | { ok: false; res: NextResponse }

// ─── Helper: buat Supabase client dari cookie ──────────────────────────────────

async function makeSupabaseFromCookie() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only */ }
      }
    }
  )
}

// ─── Helper: extract app_role dari JWT token string ───────────────────────────

function extractAppRoleFromToken(token: string): string | null {
  try {
    const parts   = token.split('.')
    if (parts.length !== 3) return null
    const pad     = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(pad, 'base64').toString('utf-8'))
    return typeof payload['app_role'] === 'string' ? payload['app_role'] : null
  } catch {
    return null
  }
}

// ─── verifyJWT ────────────────────────────────────────────────────────────────
// Dipakai oleh Server Component dan API route yang dipanggil dari server.
// Baca header x-user-* dari middleware sebagai fast path.

export const verifyJWT = cache(async (): Promise<JWTPayload | null> => {
  try {
    const headerStore   = await headers()
    const xUserId       = headerStore.get('x-user-id')
    const xUserRole     = headerStore.get('x-user-role')
    const xTenantId     = headerStore.get('x-tenant-id')
    const xDisplayName  = headerStore.get('x-user-display-name')
    const xVendorStatus = headerStore.get('x-vendor-status')

    if (xUserId && xUserRole) {
      const xIsSuperAdmin = headerStore.get('x-is-super-admin')
      const xMemberships  = headerStore.get('x-user-memberships')
      let memberships: Array<{ tenant_id: string | null; role: string; status: string }> = []
      try { if (xMemberships) memberships = JSON.parse(xMemberships) } catch { /* abaikan */ }

      return {
        uid:          xUserId,
        role:         xUserRole,
        tenantId:     xTenantId    ?? '',
        displayName:  xDisplayName ?? xUserId,
        isSuperAdmin: xIsSuperAdmin === 'true',
        memberships,
        vendorStatus: xVendorStatus ?? undefined,
      }
    }

    // Fallback ke Supabase langsung
    const supabase = await makeSupabaseFromCookie()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const appMeta = user.app_metadata || {}
    let role         = typeof appMeta['app_role']      === 'string' ? appMeta['app_role']      : ''
    let tenantId     = typeof appMeta['tenant_id']     === 'string' ? appMeta['tenant_id']     : ''
    let vendorStatus = typeof appMeta['vendor_status'] === 'string' ? appMeta['vendor_status'] : undefined

    if (!role) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const fromToken = extractAppRoleFromToken(session.access_token)
        if (fromToken) role = fromToken
      }
    }

    return {
      uid:           user.id,
      role,
      tenantId,
      displayName: typeof user.user_metadata?.['nama'] === 'string'
        ? user.user_metadata['nama']
        : user.email ?? user.id,
      isSuperAdmin: false, // fallback tidak bisa verifikasi is_super_admin tanpa header
      memberships:  [],
      vendorStatus,
    }
  } catch {
    return null
  }
})

// ─── requireSuperAdmin ────────────────────────────────────────────────────────
// Untuk: Server Component, Server Action, API route dipanggil dari server.
// Bergantung pada header x-is-super-admin dari middleware.

export async function requireSuperAdmin(): Promise<RequireSuperAdminResult> {
  const decoded = await verifyJWT()
  if (!decoded) {
    return { ok: false, res: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }) }
  }
  if (!decoded.isSuperAdmin) {
    return { ok: false, res: NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 }) }
  }
  return { ok: true, uid: decoded.uid }
}

// ─── requireSuperAdminCookie ──────────────────────────────────────────────────
// Untuk: API route yang dipanggil fetch() dari browser (client component).
// Verifikasi via cookie Supabase + cek app_role dari JWT claim.
// TIDAK bergantung pada header middleware — aman untuk client-side fetch.
//
// S#292: dibuat karena requireSuperAdmin() 403 untuk semua client-side fetch
// ke API monitoring (grafik history, alert-rules, dll).

export async function requireSuperAdminCookie(): Promise<RequireSuperAdminResult> {
  try {
    const supabase = await makeSupabaseFromCookie()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { ok: false, res: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }) }
    }

    // Cek app_metadata (diisi Edge Function inject-custom-claims)
    const appMeta = user.app_metadata ?? {}
    if (appMeta['app_role'] === 'super_admin') {
      return { ok: true, uid: user.id }
    }

    // Fallback: cek JWT token langsung
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const role = extractAppRoleFromToken(session.access_token)
      if (role === 'super_admin') {
        return { ok: true, uid: user.id }
      }
    }

    return { ok: false, res: NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 }) }
  } catch {
    return { ok: false, res: NextResponse.json({ success: false, message: 'Server error' }, { status: 500 }) }
  }
}
