// app/api/superadmin/providers/instances/route.ts
// POST — Tambah instance baru untuk satu provider (SuperAdmin only)
// Dibuat: Sesi #107 — M3 Credential Management

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { tambahInstance }             from '@/lib/services/credential.service'
import type { TambahInstancePayload } from '@/lib/types/provider.types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as TambahInstancePayload

    if (!body.provider_id?.trim() || !body.nama_server?.trim()) {
      return NextResponse.json(
        { success: false, message: 'provider_id dan nama_server wajib diisi' },
        { status: 400 }
      )
    }

    const instance = await tambahInstance(body, auth.uid)

    return NextResponse.json({ success: true, data: instance }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/superadmin/providers/instances] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
