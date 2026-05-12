// app/api/superadmin/roles/[id]/permissions/[pid]/route.ts
// DELETE — Revoke permission dari role (SuperAdmin only)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { NextRequest, NextResponse }                from 'next/server'
import { requireSuperAdmin }                        from '@/lib/auth-server'
import { PermissionsService_revokeFromRole }        from '@/lib/services/permissions.service'

// ─── DELETE — Revoke permission dari role ─────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id, pid }  = await params
    const roleId       = parseInt(id,  10)
    const permissionId = parseInt(pid, 10)

    if (isNaN(roleId) || isNaN(permissionId)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    await PermissionsService_revokeFromRole(roleId, permissionId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
