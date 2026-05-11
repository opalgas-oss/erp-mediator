// app/api/superadmin/dropdowns/options/[id]/route.ts
// PATCH — Update opsi dropdown (SuperAdmin only)
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.5

import { NextRequest, NextResponse }           from 'next/server'
import { requireSuperAdmin }                    from '@/lib/auth-server'
import { MasterDropdownService_updateOption }   from '@/lib/services/master-dropdown-option.service'
import type { UbahOpsiPayload }                 from '@/lib/types/master-dropdown.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH — Update opsi ─────────────────────────────────────────────────────

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
    const isValidation = ['Label', 'Sort', 'karakter'].some(k => message.includes(k))
    return NextResponse.json(
      { success: false, message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
