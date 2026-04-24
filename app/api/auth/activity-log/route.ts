// app/api/auth/activity-log/route.ts
// POST — Tulis activity log untuk aksi penting saat login.
// Dipanggil oleh useLoginFlow.ts dari browser — menggantikan direct DB call.
// Dibuat: Sesi #053 — FIX #7 Audit Logic FASE 1
//
// ARSITEKTUR:
//   Browser (useLoginFlow) → POST /api/auth/activity-log → ActivityService → Repository → DB

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { verifyJWT }                 from '@/lib/auth-server'
import { writeActivityLog }          from '@/lib/services/activity.service'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const ActionTypeEnum  = z.enum(['PAGE_VIEW', 'BUTTON_CLICK', 'FORM_SUBMIT', 'FORM_ERROR', 'API_CALL'])
const ResultEnum      = z.enum(['SUCCESS', 'FAILED', 'BLOCKED'])

const RequestSchema = z.object({
  uid:           z.string().min(1, 'uid wajib diisi'),
  tenant_id:     z.string(),
  nama:          z.string().default(''),
  role:          z.string().min(1, 'role wajib diisi'),
  session_id:    z.string().default(''),
  action_type:   ActionTypeEnum,
  module:        z.string().min(1, 'module wajib diisi'),
  page:          z.string().default(''),
  page_label:    z.string().default(''),
  action_detail: z.string().default(''),
  result:        ResultEnum,
  device:        z.string().default(''),
  gps_kota:      z.string().default(''),
  ip_address:    z.string().optional(),
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
    await writeActivityLog({
      uid:           data.uid,
      tenant_id:     data.tenant_id,
      nama:          data.nama,
      role:          data.role,
      session_id:    data.session_id,
      action_type:   data.action_type,
      module:        data.module,
      page:          data.page,
      page_label:    data.page_label,
      action_detail: data.action_detail,
      result:        data.result,
      device:        data.device,
      gps_kota:      data.gps_kota,
      ip_address:    data.ip_address,
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    console.error('[activity-log] Error:', error)
    // Activity log bukan critical path — tetap return 200
    return NextResponse.json({ success: false, message })
  }
}
