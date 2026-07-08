// app/api/superadmin/providers/instances/[instanceId]/test/route.ts
// POST — Authenticated test ke provider eksternal + simpan hasil (SuperAdmin only)
// S#109: delegate sepenuhnya ke testKoneksi() — tidak lagi perlu statusUrl atau loop provider
// Dibuat: Sesi #107 — M3 Credential Management
// Update: Sesi #109 — M3 Step 5.2b Authenticated Test

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { testKoneksi, setStatusManual } from '@/lib/services/credential.service'

export async function POST(
  request: NextRequest,
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

    // Cek apakah ada force_status di body (untuk provider tanpa field_defs)
    let body: { force_status?: string } = {}
    try { body = await request.json() } catch { /* body kosong = normal test */ }

    if (body.force_status) {
      await setStatusManual(instanceId, body.force_status)
      return NextResponse.json({ success: true, data: { berhasil: true, pesan: 'Status diset manual.', latency_ms: null } })
    }

    const result = await testKoneksi(instanceId)
    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('[POST /api/superadmin/providers/instances/[id]/test] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
