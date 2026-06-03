// app/api/superadmin/providers/[providerId]/field-defs/all/route.ts
// GET — List ALL field definitions (aktif + nonaktif) untuk satu provider (SuperAdmin only)
// Dipakai dialog Kelola — SA perlu lihat semua field termasuk yang dinonaktifkan
// Dibuat: Sesi #246 — HUTANG-PROVIDER-INACTIVE-TOGGLE C7 (route tambahan)

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { listFieldDefsAll }           from '@/lib/services/credential.service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { providerId } = await params
    if (!providerId) {
      return NextResponse.json(
        { success: false, message: 'providerId tidak valid' },
        { status: 400 }
      )
    }

    const fieldDefs = await listFieldDefsAll(providerId)

    return NextResponse.json({ success: true, data: fieldDefs })

  } catch (error) {
    console.error('[GET /api/superadmin/providers/[providerId]/field-defs/all] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
