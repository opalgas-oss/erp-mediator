// app/api/superadmin/roles/[id]/route.ts
// GET — Detail role beserta dua list permissions: assigned + available (SuperAdmin only)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { NextRequest, NextResponse }         from 'next/server'
import { requireSuperAdmin }                 from '@/lib/auth-server'
import { RolesService_getRoleDetail }        from '@/lib/services/roles.service'

// ─── GET — Detail role + permissions ─────────────────────────────────────────

export async function GET(
  _request: NextRequest,
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

    const data = await RolesService_getRoleDetail(roleId)
    if (!data) {
      return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
