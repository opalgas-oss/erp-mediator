// app/api/superadmin/providers/[providerId]/route.ts
// PATCH — Toggle is_aktif provider (SuperAdmin only)
// Dibuat: Sesi #249 — HUTANG-PROVIDER-INACTIVE

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { toggleProviderIsAktif }      from '@/lib/services/credential.service'

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json() as { is_aktif: boolean }
    if (typeof body.is_aktif !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'is_aktif harus boolean' },
        { status: 400 }
      )
    }

    await toggleProviderIsAktif(providerId, body.is_aktif)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[PATCH /api/superadmin/providers/[providerId]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
