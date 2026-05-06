// app/api/superadmin/providers/instances/[instanceId]/credentials/route.ts
// POST — Enkripsi dan simpan credential fields untuk satu instance (SuperAdmin only)
// Enkripsi dilakukan di CredentialService — route TIDAK menyentuh nilai plaintext
// Dibuat: Sesi #107 — M3 Credential Management

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import { simpanCredential }            from '@/lib/services/credential.service'
import type { SimpanCredentialPayload } from '@/lib/types/provider.types'

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

    const body = await request.json() as Pick<SimpanCredentialPayload, 'fields'>

    if (!body.fields || body.fields.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Minimal satu field credential harus diisi' },
        { status: 400 }
      )
    }

    await simpanCredential(
      { instance_id: instanceId, fields: body.fields },
      auth.uid
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[POST /api/superadmin/providers/instances/[id]/credentials] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
