// app/api/superadmin/refunds/[id]/reject/route.ts
// POST — SuperAdmin tolak refund (reject)
//
// Body (JSON, WAJIB):
//   resolution_notes string — alasan penolakan (wajib diisi)
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin

import { NextRequest, NextResponse }             from 'next/server'
import { requireSuperAdmin }                     from '@/lib/auth-server'
import { ComplaintService_rejectRefund }         from '@/lib/services/complaint.service'
import type { RejectRefundPayload }              from '@/lib/types/complaint.types'

// ─── POST — Reject refund ─────────────────────────────────────────────────────

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

    const body = await req.json().catch(() => ({})) as Partial<RejectRefundPayload>

    if (!body.resolution_notes || body.resolution_notes.trim() === '') {
      return NextResponse.json(
        { error: 'Alasan penolakan (resolution_notes) wajib diisi saat menolak refund' },
        { status: 422 }
      )
    }

    const payload: RejectRefundPayload = {
      resolution_notes: body.resolution_notes,
    }

    const result = await ComplaintService_rejectRefund(
      complaintId,
      payload,
      auth.uid   // SuperAdmin uid dari auth session
    )

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
