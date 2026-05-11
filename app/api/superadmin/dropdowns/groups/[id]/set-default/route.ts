// app/api/superadmin/dropdowns/groups/[id]/set-default/route.ts
// POST — Set satu opsi sebagai default di grup, unset opsi default lain (SuperAdmin only)
//
// URL param  : groupId dari [id]
// Body param : optionId — ID opsi yang akan dijadikan default
//
// Delegasi ke SP sp_dropdown_set_default_option — atomic + validasi platform-level.
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.5

import { NextRequest, NextResponse }           from 'next/server'
import { requireSuperAdmin }                    from '@/lib/auth-server'
import { MasterDropdownService_setDefaultOption }
  from '@/lib/services/master-dropdown-option.service'

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST — Set default opsi ─────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id: groupId } = await params
    const body = await request.json() as { option_id?: string }

    if (!body.option_id) {
      return NextResponse.json(
        { success: false, message: 'Field option_id wajib diisi' },
        { status: 400 }
      )
    }

    const result = await MasterDropdownService_setDefaultOption(
      groupId,
      body.option_id,
      auth.uid
    )

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[POST /api/superadmin/dropdowns/groups/[id]/set-default] Error:', error)
    const isNotFound = message.includes('tidak ditemukan')
    return NextResponse.json(
      { success: false, message },
      { status: isNotFound ? 404 : 500 }
    )
  }
}
