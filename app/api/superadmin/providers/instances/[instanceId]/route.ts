// app/api/superadmin/providers/instances/[instanceId]/route.ts
// PATCH — Update instance (use_cases dll) — SuperAdmin only
// Dibuat: Sesi #288 — FASE 2 use_case

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { patchInstanceUseCases }      from '@/lib/services/credential.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { instanceId: string } }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { instanceId } = params
    if (!instanceId) {
      return NextResponse.json(
        { success: false, message: 'instanceId tidak ditemukan' },
        { status: 400 }
      )
    }

    const body = await request.json() as { use_cases?: string[] }

    if (body.use_cases !== undefined) {
      if (!Array.isArray(body.use_cases)) {
        return NextResponse.json(
          { success: false, message: 'use_cases harus berupa array' },
          { status: 400 }
        )
      }
      await patchInstanceUseCases(instanceId, body.use_cases)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[PATCH /api/superadmin/providers/instances/[instanceId]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
