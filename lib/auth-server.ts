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

import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// ─── Tipe Hasil verifyJWT ──────────────────────────────────────────────────────
export interface JWTPayload {
  uid:           string
  role:          string
  tenantId:      string
  displayName:   string
  // BARU Sesi #077: status vendor dari JWT (Edge Function v5).
  // Vendor layout pakai value ini untuk skip query DB user_profiles.status.
  // Optional karena hanya ada di JWT vendor (SA/AT/Customer = undefined).
  // Optional juga karena JWT lama (sebelum hook v5) belum punya field ini.
  vendorStatus?: string
}

// ─── verifyJWT ────────────────────────────────────────────────────────────────
export const verifyJWT = cache(async (): Promise<JWTPayload | null> => {
  try {
    // ── Cek header dari middleware dulu ────────────────────────────────────────
    // Jika middleware sudah verify → pakai langsung, skip getUser() ke Supabase
    const headerStore   = await headers()
    const xUserId       = headerStore.get('x-user-id')
    const xUserRole     = headerStore.get('x-user-role')
    const xTenantId     = headerStore.get('x-tenant-id')
    const xDisplayName  = headerStore.get('x-user-display-name')
    const xVendorStatus = headerStore.get('x-vendor-status')

    if (xUserId && xUserRole) {
      return {
        uid:           xUserId,
        role:          xUserRole,
        tenantId:      xTenantId    ?? '',
        displayName:   xDisplayName ?? xUserId,
        vendorStatus:  xVendorStatus ?? undefined,
      }
    }

    // ── Fallback: verifikasi langsung ke Supabase ──────────────────────────────
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* Server Component tidak bisa set cookie */ }
        }
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const appMeta = user.app_metadata || {}
    let role         = typeof appMeta['app_role']      === 'string' ? appMeta['app_role']      : ''
    let tenantId     = typeof appMeta['tenant_id']     === 'string' ? appMeta['tenant_id']     : ''
    let vendorStatus = typeof appMeta['vendor_status'] === 'string' ? appMeta['vendor_status'] : undefined

    if (!role || !vendorStatus) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        try {
          const parts = session.access_token.split('.')
          if (parts.length === 3) {
            const pad     = parts[1].replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(Buffer.from(pad, 'base64').toString('utf-8'))
            if (!role         && typeof payload['app_role']      === 'string') role         = payload['app_role']
            if (!tenantId     && typeof payload['tenant_id']     === 'string') tenantId     = payload['tenant_id']
            if (!vendorStatus && typeof payload['vendor_status'] === 'string') vendorStatus = payload['vendor_status']
          }
        } catch { /* abaikan */ }
      }
    }

    return {
      uid:           user.id,
      role,
      tenantId,
      displayName: typeof user.user_metadata?.['nama'] === 'string'
        ? user.user_metadata['nama']
        : user.email ?? user.id,
      vendorStatus,
    }
  } catch {
    return null
  }
})

// ─── requireSuperAdmin ────────────────────────────────────────────────────────
// Shared auth guard untuk semua API route SuperAdmin.
// Return { ok: true, uid } jika valid SUPERADMIN.
// Return { ok: false, res } berisi NextResponse 401/403 siap dikembalikan route.
//
// CARA PAKAI di setiap API route SuperAdmin:
//   const auth = await requireSuperAdmin()
//   if (!auth.ok) return auth.res
//   // gunakan auth.uid
//
// DIBUAT: Sesi #101 — DRY fix. Menggantikan authSuperAdmin() lokal di setiap route.

export type RequireSuperAdminResult =
  | { ok: true;  uid: string }
  | { ok: false; res: NextResponse }

export async function requireSuperAdmin(): Promise<RequireSuperAdminResult> {
  const decoded = await verifyJWT()
  if (!decoded) {
    return {
      ok:  false,
      res: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }),
    }
  }
  if (decoded.role !== 'SUPERADMIN') {
    return {
      ok:  false,
      res: NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 }),
    }
  }
  return { ok: true, uid: decoded.uid }
}
