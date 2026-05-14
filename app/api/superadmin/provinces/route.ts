// app/api/superadmin/provinces/route.ts
// GET — List semua provinsi aktif
//       ?category_id=xxx&tenant_id=yyy → dengan filter exclusion untuk assign dialog
//
// Dibuat: Sesi #143 — M6 Coverage Area Revamp

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import {
  ProvinceService_getAll,
  ProvinceService_getAvailableForAssignment,
} from '@/lib/services/province.service'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = request.nextUrl
    const categoryId = searchParams.get('category_id')
    const tenantId   = searchParams.get('tenant_id')

    // Mode exclusion: dipakai saat dialog assign kategori
    if (categoryId && tenantId) {
      const result = await ProvinceService_getAvailableForAssignment(categoryId, tenantId)
      return NextResponse.json({ success: true, data: result })
    }

    // Mode default: semua provinsi aktif
    const data = await ProvinceService_getAll()
    return NextResponse.json({ success: true, data })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[GET /api/superadmin/provinces] Error:', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
