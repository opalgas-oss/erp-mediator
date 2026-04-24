// app/api/auth/session-log/route.ts
// POST — Tulis session log baru saat login berhasil.
// Dipanggil oleh useLoginFlow.ts dari browser — menggantikan direct DB call.
// Dibuat: Sesi #053 — FIX #7 Audit Logic FASE 1
//
// ARSITEKTUR:
//   Browser (useLoginFlow) → POST /api/auth/session-log → SessionService → Repository → DB

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { verifyJWT }                 from '@/lib/auth-server'
import { writeSessionLog }           from '@/lib/services/session.service'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:       z.string().min(1, 'uid wajib diisi'),
  tenant_id: z.string().nullable(),
  role:      z.string().min(1, 'role wajib diisi'),
  device:    z.string().min(1, 'device wajib diisi'),
  gps_kota:  z.string().default('Tidak Diketahui'),
})

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Verifikasi JWT ────────────────────────────────────────────────────────
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ── Validasi input ────────────────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { uid, tenant_id, role, device, gps_kota } = parsed.data

    // ── Delegasi ke SessionService ────────────────────────────────────────────
    const sessionId = await writeSessionLog({
      uid,
      tenantId: tenant_id,
      role,
      device,
      gpsKota: gps_kota,
    })

    return NextResponse.json({ success: true, session_id: sessionId })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    console.error('[session-log] Error:', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
