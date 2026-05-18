// app/api/superadmin/refunds/[id]/approve/route.ts — PRE-EDIT ARSIP S#180
// BUG AKTIF: catch selalu return { status: 400 } — harusnya classifyHttpError(message)

import { NextRequest, NextResponse }             from 'next/server'
import { requireSuperAdmin }                     from '@/lib/auth-server'
import { ComplaintService_approveRefund }        from '@/lib/services/complaint.service'
import type { ApproveRefundPayload }             from '@/lib/types/complaint.types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res
    const { id: complaintId } = await params
    if (!complaintId) {
      return NextResponse.json({ error: 'Complaint ID tidak valid' }, { status: 400 })
    }
    const body = await req.json().catch(() => ({})) as Partial<ApproveRefundPayload>
    const payload: ApproveRefundPayload = {
      resolution_notes: body.resolution_notes,
      refund_amount:    body.refund_amount,
    }
    const result = await ComplaintService_approveRefund(
      complaintId,
      payload,
      auth.uid
    )
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    // BUG: selalu return { status: 400 } — harusnya classifyHttpError(message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
