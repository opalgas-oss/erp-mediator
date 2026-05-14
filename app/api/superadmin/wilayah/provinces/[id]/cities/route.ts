// app/api/superadmin/wilayah/provinces/[id]/cities/route.ts
// GET  /api/superadmin/wilayah/provinces/[id]/cities  → list kota per provinsi (aktif+nonaktif)
// POST /api/superadmin/wilayah/provinces/[id]/cities  → tambah kab/kota baru
// Dibuat: Sesi #144 — Master Wilayah

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import {
  ProvinceService_getCitiesForAdmin,
  ProvinceService_createCity,
} from '@/lib/services/province.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const cities = await ProvinceService_getCitiesForAdmin(id)
    return NextResponse.json({ data: cities })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const { name, code, type, sort_order } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'name dan type wajib diisi' }, { status: 400 })
    }

    const city = await ProvinceService_createCity(id, {
      name,
      code: code || null,
      type,
      sort_order: sort_order ?? 999,
    })

    return NextResponse.json({ data: city }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
