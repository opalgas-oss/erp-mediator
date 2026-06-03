// app/api/superadmin/providers/[providerId]/field-defs/[fieldId]/route.ts
// PATCH — Toggle is_aktif satu field definition (SuperAdmin only)
// Dipakai oleh mode Kelola di DialogKonfigurasi.fields.tsx
// Dibuat: Sesi #246 — HUTANG-PROVIDER-INACTIVE-TOGGLE C7

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { toggleFieldDefIsAktif }      from '@/lib/services/credential.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; fieldId: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { fieldId } = await params
    if (!fieldId) {
      return NextResponse.json(
        { success: false, message: 'fieldId tidak valid' },
        { status: 400 }
      )
    }

    const body = await request.json() as { is_aktif: boolean }
    if (typeof body.is_aktif !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'is_aktif harus boolean' },
        { status: 400 }
      )
    }

    await toggleFieldDefIsAktif({ fieldDefId: fieldId, isAktif: body.is_aktif })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[PATCH /api/superadmin/providers/[providerId]/field-defs/[fieldId]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
