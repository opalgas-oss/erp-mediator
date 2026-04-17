// lib/auth-server.ts
// Fungsi autentikasi server-side — HANYA untuk Server Component dan API Route (Node.js runtime)
// JANGAN diimpor di Client Component, middleware Edge Runtime, atau lib/auth.ts
//
// Catatan arsitektur:
//   - lib/auth.ts → browser-only (setSessionCookies, clearSessionCookies, ROLE_DASHBOARD)
//   - lib/auth-server.ts → server-only (verifyJWT via Firebase Admin)
//
// Catatan cookie 'session':
//   Cookie 'session' berisi Firebase ID Token (JWT)
//   verifyJWT() membaca cookie 'session' dan verifikasi via Admin SDK

import { getAdminAuth } from '@/lib/firebase-admin'
import { cookies }      from 'next/headers'

// ─── Tipe Hasil verifyJWT ──────────────────────────────────────────────────────
export interface JWTPayload {
  uid:         string   // Firebase UID
  role:        string   // custom claim: SUPERADMIN, ADMIN_TENANT, VENDOR, CUSTOMER
  tenantId:    string   // custom claim: id tenant
  displayName: string   // nama user untuk sapaan di UI
}

// ─── verifyJWT ────────────────────────────────────────────────────────────────
// Baca cookie 'session' (Firebase ID token) dan verifikasi kriptografi via Admin SDK.
// Return null jika cookie tidak ada, token kadaluarsa, atau tanda tangan tidak valid.
// Caller wajib redirect ke /login jika return null.
export async function verifyJWT(): Promise<JWTPayload | null> {
  try {
    // cookies() di Next.js 15+ adalah async — wajib await
    const cookieStore = await cookies()
    const token       = cookieStore.get('session')?.value

    // Tidak ada cookie session → belum login atau cookie expired
    if (!token) return null

    // Verifikasi tanda tangan JWT via Firebase Admin SDK
    // getAdminAuth() pakai instance yang sama dari lib/firebase-admin.ts
    const decoded = await getAdminAuth().verifyIdToken(token)

    return {
      uid:         decoded.uid,
      role:        typeof decoded['role']      === 'string' ? decoded['role']      : '',
      tenantId:    typeof decoded['tenant_id'] === 'string' ? decoded['tenant_id'] : '',
      displayName: typeof decoded['name']      === 'string' ? decoded['name']
                   : typeof decoded['email']   === 'string' ? decoded['email']
                   : decoded.uid,
    }
  } catch {
    // Token tidak valid, kadaluarsa, atau Admin SDK error — perlakukan sebagai belum login
    return null
  }
}
