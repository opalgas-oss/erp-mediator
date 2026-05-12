// app/api/superadmin/roles/route.ts
// GET — List semua role beserta jumlah permissions (SuperAdmin only)
//
// Dibuat: Sesi #134 — M7 Roles & Permissions Management

import { NextResponse }          from 'next/server'
import { requireSuperAdmin }     from '@/lib/auth-server'
import { RolesService_listRoles } from '@/lib/services/roles.service'

// ─── GET — List semua role ───────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const data = await RolesService_listRoles()
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
