// app/api/auth/verify-otp/route.ts
// POST — Verifikasi kode OTP — atomic via SP (race-condition safe).
// Dipanggil oleh useLoginFlow.ts dari browser — menggantikan direct DB call.
// Dibuat: Sesi #053 — FIX #7 Audit Logic FASE 1
//
// ARSITEKTUR:
//   Browser (useLoginFlow) → POST /api/auth/verify-otp → OTPService → Repository → SP

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { verifyJWT }                 from '@/lib/auth-server'
import { verifyAndConsume }          from '@/lib/services/otp.service'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:        z.string().min(1, 'uid wajib diisi'),
  tenant_id:  z.string().min(1, 'tenant_id wajib diisi'),
  input_code: z.string().length(6, 'Kode OTP harus 6 digit'),
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

    const { uid, tenant_id, input_code } = parsed.data

    // ── Delegasi ke OTPService ────────────────────────────────────────────────
    const result = await verifyAndConsume({
      uid,
      tenantId:  tenant_id,
      inputCode: input_code,
    })

    // ── Map hasil SP ke response untuk client ─────────────────────────────────
    // result: 'OK' | 'EXPIRED' | 'WRONG' | 'NOT_FOUND' | 'ALREADY_USED'
    return NextResponse.json({ success: result === 'OK', result })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    console.error('[verify-otp] Error:', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
