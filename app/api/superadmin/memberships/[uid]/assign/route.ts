// app/api/superadmin/memberships/[uid]/assign/route.ts
// POST — Assign role baru ke user di tenant tertentu (SuperAdmin only)
//
// Body: { tenant_id: string, role_id: number }
//
// Dibuat: Sesi #136 — M8 User Membership Management

import { NextRequest, NextResponse }         from 'next/server'
import { requireSuperAdmin }                 from '@/lib/auth-server'
import { MembershipService_assignRole }      from '@/lib/services/membership.service'
import type { AssignRolePayload }            from '@/lib/types/user-membership.types'

// ─── POST — Assign role ───────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { uid } = await params
    const body: AssignRolePayload = await req.json()

    if (!body.tenant_id || !body.role_id) {
      return NextResponse.json(
        { error: 'tenant_id dan role_id wajib diisi' },
        { status: 400 }
      )
    }

    const result = await MembershipService_assignRole(uid, body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    const status  = message.includes('sudah memiliki') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
