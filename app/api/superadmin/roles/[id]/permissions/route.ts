// app/api/superadmin/roles/[id]/permissions/route.ts
// POST — Assign permission ke role (SuperAdmin only)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { NextRequest, NextResponse }                from 'next/server'
import { requireSuperAdmin }                        from '@/lib/auth-server'
import { PermissionsService_assignToRole }          from '@/lib/services/permissions.service'

// ─── POST — Assign permission ke role ────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const roleId = parseInt(id, 10)
    if (isNaN(roleId)) {
      return NextResponse.json({ error: 'ID role tidak valid' }, { status: 400 })
    }

    const body = await request.json() as { permission_id?: unknown }
    const permissionId = typeof body.permission_id === 'number' ? body.permission_id : NaN
    if (isNaN(permissionId)) {
      return NextResponse.json({ error: 'permission_id wajib diisi (number)' }, { status: 400 })
    }

    await PermissionsService_assignToRole(roleId, permissionId)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    const status  = message.includes('sudah ada') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
