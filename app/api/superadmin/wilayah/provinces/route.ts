// app/api/superadmin/wilayah/provinces/route.ts
// GET  /api/superadmin/wilayah/provinces  → list semua provinsi (aktif + nonaktif) untuk admin
// POST /api/superadmin/wilayah/provinces  → tambah provinsi baru
// Dibuat: Sesi #144 — Master Wilayah

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }     from '@/lib/auth-server'
import {
  ProvinceService_getAllForAdmin,
  ProvinceService_create,
} from '@/lib/services/province.service'

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if (auth instanceof NextResponse) return auth

    const provinces = await ProvinceService_getAllForAdmin()
    return NextResponse.json({ data: provinces })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const { name, code, sort_order } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'name dan code wajib diisi' }, { status: 400 })
    }

    const province = await ProvinceService_create({
      name,
      code,
      sort_order: sort_order ?? 99,
    })

    return NextResponse.json({ data: province }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
