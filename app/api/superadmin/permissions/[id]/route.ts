// app/api/superadmin/permissions/[id]/route.ts
// PATCH — Edit description permission (SuperAdmin only)
//         Code IMMUTABLE — tidak bisa diubah.
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { NextRequest, NextResponse }                   from 'next/server'
import { requireSuperAdmin }                           from '@/lib/auth-server'
import { PermissionsService_updatePermission }         from '@/lib/services/permissions.service'

// ─── PATCH — Edit description permission ─────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const permId = parseInt(id, 10)
    if (isNaN(permId)) {
      return NextResponse.json({ error: 'ID permission tidak valid' }, { status: 400 })
    }

    const body = await request.json() as { description?: unknown }
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json({ error: 'description wajib diisi' }, { status: 400 })
    }

    const data = await PermissionsService_updatePermission(permId, body.description)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    const status  = message.includes('tidak ditemukan') ? 404
                  : message.includes('kosong')          ? 400
                  : 500
    return NextResponse.json({ error: message }, { status })
  }
}
