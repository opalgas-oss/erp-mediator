// lib/auth-server.ts
// Fungsi autentikasi server-side — HANYA untuk Server Component dan API Route
// JANGAN diimpor di Client Component atau middleware Edge Runtime
//
// PERUBAHAN dari versi Firebase:
//   - verifyJWT() sekarang pakai Supabase Auth (bukan Firebase Admin verifyIdToken)
//   - Dibungkus react.cache() untuk eliminasi delay 1.97 detik dari duplikasi panggilan
//   - Role dibaca dari app_metadata JWT (diisi oleh Edge Function inject-custom-claims)

import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// ─── Tipe Hasil verifyJWT ──────────────────────────────────────────────────────
// Interface tidak berubah — caller tidak perlu diupdate
export interface JWTPayload {
  uid:         string   // Supabase user ID
  role:        string   // dari app_metadata: SUPERADMIN, ADMIN_TENANT, VENDOR, CUSTOMER
  tenantId:    string   // dari app_metadata: id tenant
  displayName: string   // nama user untuk sapaan di UI
}

// ─── verifyJWT ────────────────────────────────────────────────────────────────
// Dibungkus react.cache() agar panggilan berulang dalam satu request
// hanya hit Supabase Auth sekali — eliminasi delay 1.97 detik
export const verifyJWT = cache(async (): Promise<JWTPayload | null> => {
  try {
    const cookieStore = await cookies()

    // createServerClient dari @supabase/ssr membaca session cookie Supabase secara otomatis
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Server Component tidak bisa set cookie — diabaikan
          }
        }
      }
    )

    // Verifikasi session — getUser() melakukan full crypto verify ke Supabase Auth server
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    // Role dan tenantId dibaca dari app_metadata (diisi saat createUser via Admin API)
    // Fallback: baca dari JWT payload via getSession() — diisi oleh inject-custom-claims hook
    // Fallback diperlukan untuk user yang dibuat sebelum app_metadata di-set dengan benar
    const appMeta = user.app_metadata || {}

    let role     = typeof appMeta['app_role']  === 'string' ? appMeta['app_role']  : ''
    let tenantId = typeof appMeta['tenant_id'] === 'string' ? appMeta['tenant_id'] : ''

    if (!role) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        try {
          const parts = session.access_token.split('.')
          if (parts.length === 3) {
            const pad     = parts[1].replace(/-/g, '+').replace(/_/g, '/')
            const payload = JSON.parse(Buffer.from(pad, 'base64').toString('utf-8'))
            if (typeof payload['app_role']  === 'string') role     = payload['app_role']
            if (typeof payload['tenant_id'] === 'string') tenantId = payload['tenant_id']
          }
        } catch {
          // JWT tidak bisa di-decode — abaikan
        }
      }
    }

    return {
      uid:         user.id,
      role,
      tenantId,
      displayName: typeof user.user_metadata?.['nama'] === 'string'
        ? user.user_metadata['nama']
        : user.email ?? user.id,
    }
  } catch {
    // Session tidak valid atau error — perlakukan sebagai belum login
    return null
  }
})