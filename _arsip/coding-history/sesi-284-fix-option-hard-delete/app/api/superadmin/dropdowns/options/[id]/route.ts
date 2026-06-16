// ARSIP pra-edit — sesi-284-fix-option-hard-delete
// Original: app/api/superadmin/dropdowns/options/[id]/route.ts
// Hanya ada PATCH, tidak ada DELETE handler

import { NextRequest, NextResponse }           from 'next/server'
import { requireSuperAdmin }                    from '@/lib/auth-server'
import { MasterDropdownService_updateOption }   from '@/lib/services/master-dropdown-option.service'
import type { UbahOpsiPayload }                 from '@/lib/types/master-dropdown.types'
import { classifyHttpError } from '@/lib/utils/http.server'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body = await request.json() as UbahOpsiPayload

    const data = await MasterDropdownService_updateOption(id, body, auth.uid)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/dropdowns/options/[id]] Error:', error)
    return NextResponse.json(
      { success: false, message },
      { status: classifyHttpError(message) }
    )
  }
}
