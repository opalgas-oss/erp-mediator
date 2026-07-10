// app/api/superadmin/providers/instances/[instanceId]/route.ts
// PATCH — Update instance (use_cases + business_impact dll) — SuperAdmin only
// Dibuat: Sesi #288 — FASE 2 use_case
// Update: Sesi #349 — B3: tambah business_impact ke PATCH payload

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { patchInstanceUseCases, patchInstanceBusinessImpact } from '@/lib/services/credential.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { instanceId } = await params
    if (!instanceId) {
      return NextResponse.json(
        { success: false, message: 'instanceId tidak ditemukan' },
        { status: 400 }
      )
    }

    const body = await request.json() as { use_cases?: string[]; business_impact?: string | null; is_aktif?: boolean }

    if (body.use_cases !== undefined) {
      if (!Array.isArray(body.use_cases)) {
        return NextResponse.json(
          { success: false, message: 'use_cases harus berupa array' },
          { status: 400 }
        )
      }
      await patchInstanceUseCases(instanceId, body.use_cases)
    }

    // S#349 B3 — update business_impact
    if ('business_impact' in body) {
      await patchInstanceBusinessImpact(instanceId, body.business_impact ?? null)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[PATCH /api/superadmin/providers/instances/[instanceId]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
