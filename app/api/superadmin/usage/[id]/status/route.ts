// app/api/superadmin/usage/[id]/status/route.ts
// PATCH — Ubah lifecycle_status dependency di registry_dependencies.
// SP sudah catat audit trail (status_changed_at, status_changed_by).
//
// URL param : [id] — UUID row di registry_dependencies
// Body      : { new_status: LifecycleStatus }
//   Valid values: RENCANA | DIBANGUN | AKTIF | TIDAK_DIPAKAI
//
// SP yang dipakai: sp_update_dependency_status(p_dependency_id, p_new_status, p_changed_by)
//
// Dibuat: Sesi #121 — PL-S12 Shared UI + API Routes USAGE_TRACKING

import { NextRequest, NextResponse }               from 'next/server'
import { requireSuperAdmin }                       from '@/lib/auth-server'
import { UsageTrackingService_updateStatus }       from '@/lib/services/usage-tracking.service'
import type {
  UpdateDependencyStatusPayload,
  LifecycleStatus,
} from '@/lib/types/usage-tracking.types'

// ─── Nilai status yang valid ──────────────────────────────────────────────────

const VALID_STATUSES: LifecycleStatus[] = ['RENCANA', 'DIBANGUN', 'AKTIF', 'TIDAK_DIPAKAI']

// ─── PATCH — Ubah lifecycle status ───────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID dependency wajib ada di URL' },
        { status: 400 }
      )
    }

    const body = await request.json() as UpdateDependencyStatusPayload

    if (!body.new_status || !VALID_STATUSES.includes(body.new_status)) {
      return NextResponse.json(
        {
          success: false,
          message: `new_status wajib diisi dan harus salah satu dari: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const result = await UsageTrackingService_updateStatus(id, body.new_status, auth.uid)
    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('[PATCH /api/superadmin/usage/[id]/status] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
