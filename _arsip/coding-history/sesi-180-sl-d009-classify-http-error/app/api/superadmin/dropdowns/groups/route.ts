// app/api/superadmin/dropdowns/groups/route.ts — PRE-EDIT ARSIP S#180
// app/api/superadmin/dropdowns/groups/route.ts
// GET  — List semua grup dropdown (SuperAdmin only)
// POST — Buat grup dropdown baru (SuperAdmin only)
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.5

import { NextRequest, NextResponse }              from 'next/server'
import { requireSuperAdmin }                       from '@/lib/auth-server'
import {
  MasterDropdownService_listGroupsWithOptions,
  MasterDropdownService_createGroup,
} from '@/lib/services/master-dropdown-group.service'
import type { BuatGrupPayload, DropdownCategory } from '@/lib/types/master-dropdown.types'

// ─── GET — List semua grup beserta opsinya ───────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = request.nextUrl
    const categoryParam = searchParams.get('category') as DropdownCategory | null
    const isActiveParam = searchParams.get('is_active')

    const filter: { category?: DropdownCategory; isActive?: boolean } = {}
    if (categoryParam)          filter.category = categoryParam
    if (isActiveParam !== null) filter.isActive  = isActiveParam !== 'false'

    const data = await MasterDropdownService_listGroupsWithOptions(filter)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/dropdowns/groups] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── POST — Buat grup dropdown baru ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as BuatGrupPayload

    if (!body.slug || !body.display_name || !body.category) {
      return NextResponse.json(
        { success: false, message: 'Field slug, display_name, dan category wajib diisi' },
        { status: 400 }
      )
    }

    const data = await MasterDropdownService_createGroup(body, auth.uid)
    return NextResponse.json({ success: true, data }, { status: 201 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[POST /api/superadmin/dropdowns/groups] Error:', error)
    const isValidationError = [
      'Slug', 'Nama', 'Sort', 'karakter', 'huruf kecil',
    ].some(k => message.includes(k))
    return NextResponse.json(
      { success: false, message },
      { status: isValidationError ? 400 : 500 }
    )
  }
}
