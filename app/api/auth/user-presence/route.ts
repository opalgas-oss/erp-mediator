// app/api/auth/user-presence/route.ts
// POST — Update posisi user (presence) saat login atau navigasi.
// Dipanggil oleh useLoginFlow.ts dari browser — menggantikan direct DB call.
// Dibuat: Sesi #053 — FIX #7 Audit Logic FASE 1
//
// ARSITEKTUR:
//   Browser (useLoginFlow) → POST /api/auth/user-presence → ActivityService → Repository → SP

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { verifyJWT }                 from '@/lib/auth-server'
import { updateUserPresence }        from '@/lib/services/activity.service'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:                z.string().min(1, 'uid wajib diisi'),
  tenant_id:          z.string().nullable(),
  nama:               z.string().default(''),
  role:               z.string().min(1, 'role wajib diisi'),
  device:             z.string().default(''),
  current_page:       z.string().default(''),
  current_page_label: z.string().default(''),
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

    const data = parsed.data

    // ── Delegasi ke ActivityService ───────────────────────────────────────────
    await updateUserPresence({
      uid:              data.uid,
      tenantId:         data.tenant_id,
      nama:             data.nama,
      role:             data.role,
      device:           data.device,
      currentPage:      data.current_page,
      currentPageLabel: data.current_page_label,
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    console.error('[user-presence] Error:', error)
    // Presence bukan critical path — tetap return 200 agar flow client tidak terganggu
    return NextResponse.json({ success: false, message })
  }
}
