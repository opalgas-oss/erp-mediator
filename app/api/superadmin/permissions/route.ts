// app/api/superadmin/permissions/route.ts
// GET  — List semua permission beserta role yang memilikinya (SuperAdmin only)
// POST — Tambah permission baru (SuperAdmin only)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { NextRequest, NextResponse }                   from 'next/server'
import { requireSuperAdmin }                           from '@/lib/auth-server'
import {
  PermissionsService_listPermissions,
  PermissionsService_addPermission,
} from '@/lib/services/permissions.service'
import type { CreatePermissionPayload } from '@/lib/types/roles-permissions.types'

// ─── GET — List semua permission ─────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const data = await PermissionsService_listPermissions()
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST — Tambah permission baru ───────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as Partial<CreatePermissionPayload>

    if (!body.code || !body.description) {
      return NextResponse.json(
        { error: 'code dan description wajib diisi' },
        { status: 400 }
      )
    }

    const data = await PermissionsService_addPermission({
      code:        body.code,
      description: body.description,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    const status  = message.includes('Format') || message.includes('kosong') ? 400
                  : message.includes('sudah')                                ? 409
                  : 500
    return NextResponse.json({ error: message }, { status })
  }
}
