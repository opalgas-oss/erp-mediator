// app/api/auth/set-custom-claims/route.ts
// POST — Set custom claims JWT: role, tenant_id, session_timeout_minutes
// Dipanggil setelah login berhasil — bukan dari browser langsung

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getEffectivePolicy } from '@/lib/policy'

// ─── Inisialisasi Firebase Admin ──────────────────────────────────────────────
// Hanya inisialisasi sekali — getApps() mencegah duplikasi instance
function initAdmin() {
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

// ─── Skema Validasi Input ─────────────────────────────────────────────────────
const RequestSchema = z.object({
  uid:       z.string().min(1, 'uid wajib diisi'),
  role:      z.string().min(1, 'role wajib diisi'),
  tenant_id: z.string().min(1, 'tenant_id wajib diisi'),
})

// ─── Role yang Diizinkan ──────────────────────────────────────────────────────
const ROLE_DIIZINKAN = ['CUSTOMER', 'VENDOR', 'ADMIN_TENANT', 'SUPERADMIN'] as const

// ─── Handler POST ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    initAdmin()

    // ── Validasi input dengan Zod ───────────────────────────────────────────
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { uid, role, tenant_id } = parsed.data

    // ── Validasi role — hanya role yang terdaftar ───────────────────────────
    if (!ROLE_DIIZINKAN.includes(role as typeof ROLE_DIIZINKAN[number])) {
      return NextResponse.json(
        { error: `Role tidak valid. Role yang diizinkan: ${ROLE_DIIZINKAN.join(', ')}` },
        { status: 400 }
      )
    }

    // ── Baca session_timeout_minutes dari policy ────────────────────────────
    // Merge 2 level: platform default + tenant override via getEffectivePolicy
    // Field: security_login.session_timeout_minutes (angka menit)
    // Jika policy tidak ada atau bukan angka positif → embed null (timeout dinonaktifkan)
    const policy = await getEffectivePolicy(tenant_id, 'security_login')
    const timeoutMenit =
      typeof policy.session_timeout_minutes === 'number' &&
      policy.session_timeout_minutes > 0
        ? policy.session_timeout_minutes
        : null

    // ── Set custom claims ke JWT user di Firebase ───────────────────────────
    // Middleware membaca claims ini di Edge Runtime untuk RBAC dan timeout check
    await getAuth().setCustomUserClaims(uid, {
      role,
      tenant_id,
      is_platform_owner:      false,
      session_timeout_minutes: timeoutMenit,  // null = timeout tidak aktif
    })

    // ── Catat audit log ke Firestore ────────────────────────────────────────
    const db = getFirestore()
    await db.collection(`tenants/${tenant_id}/audit_logs`).add({
      action:                  'SET_CUSTOM_CLAIMS',
      actor:                   uid,
      role,
      tenant_id,
      session_timeout_minutes: timeoutMenit,
      timestamp:               new Date(),
    })

    return NextResponse.json(
      { success: true, message: 'Custom claims berhasil ditetapkan' },
      { status: 200 }
    )

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
