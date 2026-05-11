// app/api/superadmin/dropdowns/groups/[id]/route.ts
// GET    — Detail satu grup beserta opsinya (SuperAdmin only)
// PATCH  — Update grup dropdown (SuperAdmin only)
// DELETE — Nonaktifkan grup + cascade nonaktifkan opsinya (SuperAdmin only)
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.5

import { NextRequest, NextResponse }          from 'next/server'
import { requireSuperAdmin }                   from '@/lib/auth-server'
import {
  MasterDropdownService_getGroupDetail,
  MasterDropdownService_updateGroup,
  MasterDropdownService_deactivateGroup,
} from '@/lib/services/master-dropdown-group.service'
import type { UbahGrupPayload }               from '@/lib/types/master-dropdown.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — Detail grup + opsi ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const data = await MasterDropdownService_getGroupDetail(id)

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Grup dropdown tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/dropdowns/groups/[id]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── PATCH — Update grup ─────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body = await request.json() as UbahGrupPayload

    const data = await MasterDropdownService_updateGroup(id, body, auth.uid)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/dropdowns/groups/[id]] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isValidation = ['Nama', 'Sort', 'Kategori', 'karakter'].some(k => message.includes(k))
    const status = isNotFound ? 404 : isValidation ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}

// ─── DELETE — Nonaktifkan grup + cascade opsi ────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const result = await MasterDropdownService_deactivateGroup(id, auth.uid)

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[DELETE /api/superadmin/dropdowns/groups/[id]] Error:', error)
    const isNotFound = message.includes('tidak ditemukan')
    const isSystem   = message.includes('sistem')
    const status = isNotFound ? 404 : isSystem ? 403 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
