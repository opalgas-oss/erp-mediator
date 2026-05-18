// app/api/superadmin/tenants/[id]/categories/[assignmentId]/route.ts — PRE-EDIT ARSIP S#180

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import {
  TCAService_suspend,
  TCAService_aktifkanKembali,
  TCAService_cabut,
  TCAService_updateOverrideKomisi,
} from '@/lib/services/tenant-category-assignment.service'
import type {
  SuspendAssignmentPayload,
  RevokeAssignmentPayload,
  UpdateOverridePayload,
} from '@/lib/types/tenant-category-assignment.types'

type RouteContext = { params: Promise<{ id: string; assignmentId: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res
    const { assignmentId } = await params
    const body = await request.json() as {
      action: 'suspend' | 'aktifkan-kembali' | 'update-override'
    } & SuspendAssignmentPayload & UpdateOverridePayload
    if (!body.action) {
      return NextResponse.json(
        { success: false, message: 'Field action wajib diisi' },
        { status: 400 }
      )
    }
    switch (body.action) {
      case 'suspend':
        await TCAService_suspend(assignmentId, { suspend_reason: body.suspend_reason }, auth.uid)
        break
      case 'aktifkan-kembali':
        await TCAService_aktifkanKembali(assignmentId, auth.uid)
        break
      case 'update-override':
        await TCAService_updateOverrideKomisi(
          assignmentId,
          { commission_override: body.commission_override, coverage_areas: body.coverage_areas, sla_minutes: body.sla_minutes },
          auth.uid
        )
        break
      default:
        return NextResponse.json(
          { success: false, message: `Action tidak dikenali: ${body.action}` },
          { status: 400 }
        )
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/tenants/[id]/categories/[assignmentId]] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isValidation = ['wajib', 'Hanya', 'antara', 'komisi'].some(k => message.includes(k))
    const status = isNotFound ? 404 : isValidation ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res
    const { assignmentId } = await params
    const body = await request.json() as RevokeAssignmentPayload
    if (!body.revoke_reason?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Alasan pencabutan wajib diisi' },
        { status: 400 }
      )
    }
    await TCAService_cabut(assignmentId, body, auth.uid)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[DELETE /api/superadmin/tenants/[id]/categories/[assignmentId]] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isAlreadyDel = message.includes('sudah dicabut')
    const status = isNotFound ? 404 : isAlreadyDel ? 409 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
