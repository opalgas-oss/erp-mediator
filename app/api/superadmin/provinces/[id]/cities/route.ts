// app/api/superadmin/provinces/[id]/cities/route.ts
// GET — List kota/kabupaten per provinsi
//       ?excluded=city_id1,city_id2 → tandai kota yang sudah dipakai (exclusion)
//
// Dibuat: Sesi #143 — M6 Coverage Area Revamp

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import {
  ProvinceService_getCitiesByProvince,
  ProvinceService_getCitiesWithExclusion,
} from '@/lib/services/province.service'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id: provinceId } = await params
    const { searchParams }   = request.nextUrl
    const excludedParam      = searchParams.get('excluded') // comma-separated city IDs

    if (excludedParam !== null) {
      // Mode exclusion: tandai kota yang sudah dipakai tenant lain
      const excludedCityIds = excludedParam ? excludedParam.split(',').filter(Boolean) : []
      const data = await ProvinceService_getCitiesWithExclusion(provinceId, excludedCityIds)
      return NextResponse.json({ success: true, data })
    }

    // Mode default: semua kota aktif di provinsi
    const data = await ProvinceService_getCitiesByProvince(provinceId)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[GET /api/superadmin/provinces/[id]/cities] Error:', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
