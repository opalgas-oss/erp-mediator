// lib/auth-server.ts
// Fungsi autentikasi server-side — HANYA untuk Server Component dan API Route (Node.js runtime)
// JANGAN diimpor di Client Component, middleware Edge Runtime, atau lib/auth.ts
//
// Catatan arsitektur:
//   - lib/auth.ts → browser-only (setSessionCookies, clearSessionCookies, ROLE_DASHBOARD)
//   - lib/auth-server.ts → server-only (verifyJWT via Firebase Admin)
//
// Catatan cookie 'session':
//   Middleware membaca cookie 'session' sebagai Firebase ID token.
//   Login page saat ini baru set cookie 'session_role' dan 'session_tenant' via setSessionCookies().
//   Agar verifyJWT() bekerja, login page perlu menyimpan Firebase ID token ke cookie 'session'.
//   Ini akan diperbaiki di Sprint 2 — lihat: app/login/page.tsx → selesaiLogin()

import { initializeApp, getApps, cert }  from 'firebase-admin/app'
import { getAuth }                        from 'firebase-admin/auth'
import { cookies }                        from 'next/headers'

// ─── Inisialisasi Firebase Admin ─────────────────────────────────────────────
// Hanya inisialisasi sekali — getApps() mencegah duplikasi instance
function initAdmin(): void {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

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
    initAdmin()

    // cookies() di Next.js 15+ adalah async — wajib await
    const cookieStore = await cookies()
    const token       = cookieStore.get('session')?.value

    // Tidak ada cookie session → belum login atau cookie expired
    if (!token) return null

    // Verifikasi tanda tangan JWT via Firebase Admin SDK
    const decoded = await getAuth().verifyIdToken(token)

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
