// app/api/auth/unlock-account/route.ts
// POST — Buka kunci akun yang terkunci karena terlalu banyak percobaan login gagal.
//
// Dua skenario:
//   method "auto"   → dipanggil server setelah login berhasil, reset counter
//   method "manual" → dipanggil SuperAdmin dari dashboard (Sprint 2), butuh otorisasi JWT

import { NextRequest, NextResponse }    from 'next/server'
import { z }                            from 'zod'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth }                      from 'firebase-admin/auth'
import { unlockAccount }                from '@/lib/account-lock'

// ─── Inisialisasi Firebase Admin ─────────────────────────────────────────────
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
  uid:              z.string().min(1, 'uid wajib diisi'),
  tenant_id:        z.string().min(1, 'tenant_id wajib diisi'),
  method:           z.enum(['auto', 'manual'] as const, {
    message: 'method harus "auto" atau "manual"',
  }),
  unlocked_by_uid:  z.string().optional(),
})

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    initAdmin()

    // ── Validasi input dengan Zod ─────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { uid, tenant_id, method, unlocked_by_uid } = parsed.data

    // ── Custom validation: method "manual" wajib sertakan unlocked_by_uid ─────
    if (method === 'manual' && !unlocked_by_uid) {
      return NextResponse.json(
        { error: 'unlocked_by_uid wajib ada untuk method manual' },
        { status: 400 },
      )
    }

    // ── Otorisasi — hanya untuk method "manual" ───────────────────────────────
    // method "auto" dipanggil dari server sendiri, tidak perlu verifikasi
    if (method === 'manual') {
      const authHeader = request.headers.get('Authorization')

      // Wajib ada header Authorization: Bearer <token>
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const token = authHeader.replace('Bearer ', '')

      // Decode dan verifikasi JWT via Firebase Admin
      let decodedToken
      try {
        decodedToken = await getAuth().verifyIdToken(token)
      } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Hanya SUPERADMIN yang boleh unlock manual
      if (decodedToken.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // ── Buka kunci akun via lib/account-lock ─────────────────────────────────
    await unlockAccount(uid, tenant_id, method, unlocked_by_uid)

    return NextResponse.json({ success: true, method })

  } catch (error: unknown) {
    // Tidak ekspos stack trace ke client — hanya pesan singkat
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
