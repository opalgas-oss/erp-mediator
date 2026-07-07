// app/api/monitoring/alerts/[id]/route.ts
// PATCH — Aksi lifecycle: acknowledge / resolve / reopen (M1, A3)
// Dipakai oleh: tombol Tandai Ditangani / Tandai Selesai / Buka Kembali di UI monitoring
// Dibuat: Sesi #331 — FASE 1 Alert Monitoring
//
// Body PATCH:
//   { action: 'acknowledge' }
//   { action: 'resolve', resolutionNote: 'catatan...' }
//   { action: 'reopen' }
// State machine divalidasi oleh alert-lifecycle.service (A3).

import { NextRequest, NextResponse }   from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import {
  acknowledgeAlert,
  resolveAlert,
  reopenAlert,
} from '@/lib/services/alert-lifecycle.service'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  const { id } = await params

  let body: { action?: string; resolutionNote?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Body request tidak valid (bukan JSON)' },
      { status: 400 }
    )
  }

  const { action, resolutionNote } = body

  if (!action) {
    return NextResponse.json(
      { success: false, message: 'Field "action" wajib diisi (acknowledge / resolve / reopen)' },
      { status: 400 }
    )
  }

  try {
    switch (action) {
      case 'acknowledge':
        await acknowledgeAlert({ alertLogId: id, acknowledgedBy: auth.uid })
        return NextResponse.json({ success: true, message: 'Insiden ditandai sedang ditangani.' })

      case 'resolve':
        if (!resolutionNote?.trim()) {
          return NextResponse.json(
            { success: false, message: 'Catatan penyelesaian wajib diisi saat resolve insiden.' },
            { status: 400 }
          )
        }
        await resolveAlert({ alertLogId: id, resolvedBy: auth.uid, resolutionNote })
        return NextResponse.json({ success: true, message: 'Insiden ditandai selesai.' })

      case 'reopen':
        await reopenAlert(id)
        return NextResponse.json({ success: true, message: 'Insiden dibuka kembali.' })

      default:
        return NextResponse.json(
          { success: false, message: `Aksi tidak dikenal: ${action}. Gunakan: acknowledge / resolve / reopen` },
          { status: 400 }
        )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Transisi tidak valid dari state machine → 422
    const isStateError = message.includes('Transisi status tidak valid')
    return NextResponse.json(
      { success: false, message },
      { status: isStateError ? 422 : 500 }
    )
  }
}
