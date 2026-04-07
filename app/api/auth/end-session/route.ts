// app/api/auth/end-session/route.ts
// POST — Tandai sesi user sebagai offline saat logout
// Update dokumen session_logs: status = "offline", logout_at = serverTimestamp()
// Menggunakan Firebase Admin SDK untuk operasi Firestore di sisi server

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// ─── Inisialisasi Firebase Admin ─────────────────────────────────────────────
// Hanya inisialisasi sekali — getApps() mencegah duplikasi instance
function initAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

// ─── Skema Validasi Input ─────────────────────────────────────────────────────
const RequestSchema = z.object({
  uid:        z.string().min(1, 'uid wajib diisi'),
  tenant_id:  z.string().min(1, 'tenant_id wajib diisi'),
  session_id: z.string().min(1, 'session_id wajib diisi'),
})

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

    const { tenant_id, session_id } = parsed.data

    // ── Update dokumen session_logs ───────────────────────────────────────────
    // Path: /tenants/{tenant_id}/session_logs/{session_id}
    // tenant_id dari request body — tidak pernah hardcode
    const db = getFirestore()
    const sessionRef = db.doc(`tenants/${tenant_id}/session_logs/${session_id}`)

    await sessionRef.update({
      status:    'offline',
      logout_at: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    // Semua error server dikembalikan sebagai status 500
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
