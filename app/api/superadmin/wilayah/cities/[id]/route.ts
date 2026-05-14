// app/api/superadmin/wilayah/cities/[id]/route.ts
// PATCH  /api/superadmin/wilayah/cities/[id]  → edit nama / tipe / nonaktifkan / aktifkan
// DELETE /api/superadmin/wilayah/cities/[id]  → nonaktifkan (soft, is_active=false)
// Dibuat: Sesi #144 — Master Wilayah

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import { ProvinceService_updateCity } from '@/lib/services/province.service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { name, code, type, is_active } = body

    const updated = await ProvinceService_updateCity(id, {
      ...(name      !== undefined && { name }),
      ...(code      !== undefined && { code }),
      ...(type      !== undefined && { type }),
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
    const updated = await ProvinceService_updateCity(id, { is_active: false })
    return NextResponse.json({ data: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
