// app/api/auth/check-session/route.ts
// POST — Cek apakah user sudah punya sesi aktif di tenant ini
// Dipakai sebelum login selesai untuk menegakkan aturan sesi paralel
// Menggunakan Firebase Admin SDK untuk query Firestore di sisi server

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getEffectivePolicy } from '@/lib/policy'

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
  uid:       z.string().min(1, 'uid wajib diisi'),
  tenant_id: z.string().min(1, 'tenant_id wajib diisi'),
})

// ─── Tipe Data Sesi yang Dikembalikan ────────────────────────────────────────
interface SessionData {
  device:    string
  gps_kota:  string
  login_at:  unknown  // Firestore Timestamp — dibiarkan unknown agar aman diSerialize
  role:      string
}

// ─── Handler POST ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    initAdmin()

    // ── Validasi input dengan Zod ───────────────────────────────────────────
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { uid, tenant_id } = parsed.data

    // ── Baca policy concurrent_session (merge 2 level: platform + tenant) ───
    // tenant_id dari request body — tidak pernah hardcode
    const policy = await getEffectivePolicy(tenant_id, 'concurrent_session')

    // ── Evaluasi rule 'none' — tidak perlu query Firestore sama sekali ───────
    // Langsung izinkan tanpa cek sesi aktif
    if (policy.rule === 'none') {
      return NextResponse.json({ hasActiveSession: false, blocked: false })
    }

    // ── Query session_logs — cari sesi aktif untuk uid ini ───────────────────
    // Path Firestore: /tenants/{tenant_id}/session_logs
    // Filter: uid == request.uid AND status == "online"
    // Limit wajib ada — dilarang ambil semua dokumen sekaligus (aturan performa)
    const db = getFirestore()
    const querySnap = await db
      .collection(`tenants/${tenant_id}/session_logs`)
      .where('uid', '==', uid)
      .where('status', '==', 'online')
      .limit(10)
      .get()

    // ── Tidak ada sesi aktif — izinkan login ─────────────────────────────────
    if (querySnap.empty) {
      return NextResponse.json({ hasActiveSession: false, blocked: false })
    }

    // ── Ada sesi aktif — ambil data sesi pertama sebagai referensi ───────────
    const docData = querySnap.docs[0].data()
    const sessionData: SessionData = {
      device:   typeof docData.device   === 'string' ? docData.device   : '',
      gps_kota: typeof docData.gps_kota === 'string' ? docData.gps_kota : '',
      login_at: docData.login_at ?? null,
      role:     typeof docData.role     === 'string' ? docData.role     : '',
    }

    // ── Evaluasi rule 'always' — blokir jika ada sesi aktif apapun ───────────
    if (policy.rule === 'always') {
      return NextResponse.json({
        hasActiveSession: true,
        blocked: true,
        sessionData,
      })
    }

    // ── Evaluasi rule 'different_role_only' ──────────────────────────────────
    // Blokir hanya kalau role sesi aktif sama dengan role sesi baru.
    // Karena request body tidak membawa role sesi baru, dan satu uid hanya
    // memiliki satu role (tersimpan di custom claims), role sesi aktif pasti
    // sama dengan role yang akan dipakai sesi baru → selalu blocked.
    if (policy.rule === 'different_role_only') {
      return NextResponse.json({
        hasActiveSession: true,
        blocked: true,
        sessionData,
      })
    }

    // ── Fallback — rule tidak dikenal → izinkan ───────────────────────────────
    return NextResponse.json({ hasActiveSession: true, blocked: false, sessionData })

  } catch (error: unknown) {
    // Semua error server dikembalikan sebagai status 500
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
