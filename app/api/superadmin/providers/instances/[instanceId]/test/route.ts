// app/api/superadmin/providers/instances/[instanceId]/test/route.ts
// POST — Authenticated test ke provider eksternal + simpan hasil (SuperAdmin only)
// S#109: delegate sepenuhnya ke testKoneksi() — tidak lagi perlu statusUrl atau loop provider
// Dibuat: Sesi #107 — M3 Credential Management
// Update: Sesi #109 — M3 Step 5.2b Authenticated Test

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { testKoneksi }                from '@/lib/services/credential.service'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { instanceId } = await params
    if (!instanceId) {
      return NextResponse.json(
        { success: false, message: 'instanceId tidak valid' },
        { status: 400 }
      )
    }

    const result = await testKoneksi(instanceId)

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('[POST /api/superadmin/providers/instances/[id]/test] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
