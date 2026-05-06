// app/api/superadmin/providers/[providerId]/field-defs/route.ts
// GET — List field definitions untuk satu provider (SuperAdmin only)
// Dipakai dialog Isi Credential — render field dinamis sesuai provider yang dipilih
// Dibuat: Sesi #108 — fix M3 missing GET route

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { listFieldDefs }              from '@/lib/services/credential.service'

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

    const fieldDefs = await listFieldDefs(providerId)

    return NextResponse.json({ success: true, data: fieldDefs })

  } catch (error) {
    console.error('[GET /api/superadmin/providers/[providerId]/field-defs] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
