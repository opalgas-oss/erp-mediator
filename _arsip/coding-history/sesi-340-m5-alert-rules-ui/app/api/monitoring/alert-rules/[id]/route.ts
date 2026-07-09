// app/api/monitoring/alert-rules/[id]/route.ts
// PATCH — Update threshold / setting satu alert rule dari form SuperAdmin
// Dipanggil oleh: AlertSettingsDialog.tsx (submit form)
// Dibuat: Sesi #153 — PL-S09 Step 3.5

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import { patchAlertRule }            from '@/lib/services/monitoring.service'
import type { UpdateAlertRulePayload } from '@/lib/types/monitoring.types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  const { id } = await params

  let body: UpdateAlertRulePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Body request tidak valid' },
      { status: 400 }
    )
  }

  // Validasi: minimal ada satu field yang diupdate
  const allowedKeys: Array<keyof UpdateAlertRulePayload> = [
    'threshold_value',
    'consecutive_failures',
    'cooldown_minutes',
    'notif_channels',
    'is_active',
  ]
  const hasValidKey = allowedKeys.some(k => k in body)
  if (!hasValidKey) {
    return NextResponse.json(
      { success: false, message: 'Tidak ada field yang valid untuk diupdate' },
      { status: 400 }
    )
  }

  try {
    const updated = await patchAlertRule(id, body, auth.uid)
    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal mengupdate alert rule'
    console.error(`[PATCH /api/monitoring/alert-rules/${id}]`, err)
    return NextResponse.json({ success: false, message: msg }, { status: 400 })
  }
}
