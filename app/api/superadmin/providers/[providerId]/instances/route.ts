// app/api/superadmin/providers/[providerId]/instances/route.ts
// GET — List semua instances milik satu provider (SuperAdmin only)
// Dibuat: Sesi #108 — fix M3 missing GET route

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { listInstances }              from '@/lib/services/credential.service'

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

    const instances = await listInstances(providerId)

    return NextResponse.json({ success: true, data: instances })

  } catch (error) {
    console.error('[GET /api/superadmin/providers/[providerId]/instances] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
