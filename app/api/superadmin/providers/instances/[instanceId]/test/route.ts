// app/api/superadmin/providers/instances/[instanceId]/test/route.ts
// POST — Test koneksi ke provider eksternal + simpan hasil (SuperAdmin only)
// HTTP ping dilakukan di CredentialService — route hanya trigger dan return hasil
// Dibuat: Sesi #107 — M3 Credential Management

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { testKoneksi, listProviders, listInstances } from '@/lib/services/credential.service'

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

    // Ambil status_url provider dari instance ini untuk HTTP ping
    // Cara: ambil semua provider → cari provider yang punya instance ini
    const providers = await listProviders()
    let statusUrl: string | null = null

    for (const p of providers) {
      const instances = await listInstances(p.id)
      const found     = instances.find(i => i.id === instanceId)
      if (found) {
        statusUrl = p.status_url
        break
      }
    }

    const result = await testKoneksi(instanceId, statusUrl)

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('[POST /api/superadmin/providers/instances/[id]/test] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
