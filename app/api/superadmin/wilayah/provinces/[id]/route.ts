// app/api/superadmin/wilayah/provinces/[id]/route.ts
// PATCH  /api/superadmin/wilayah/provinces/[id]  → edit nama / nonaktifkan / aktifkan
// DELETE /api/superadmin/wilayah/provinces/[id]  → nonaktifkan (soft, is_active=false)
// Dibuat: Sesi #144 — Master Wilayah

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import { ProvinceService_update }    from '@/lib/services/province.service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { name, code, is_active } = body

    const updated = await ProvinceService_update(id, {
      ...(name      !== undefined && { name }),
      ...(code      !== undefined && { code }),
      ...(is_active !== undefined && { is_active }),
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const updated = await ProvinceService_update(id, { is_active: false })
    return NextResponse.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
