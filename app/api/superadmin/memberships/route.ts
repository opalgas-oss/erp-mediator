// app/api/superadmin/memberships/route.ts
// GET — List semua membership dengan filter + pagination (SuperAdmin only)
//
// Query params:
//   search    — cari by nama atau email
//   tenant_id — filter by tenant
//   role_id   — filter by role (number)
//   status    — active | inactive | all (default: all)
//   page      — default 1
//   per_page  — default 50
//
// Dibuat: Sesi #136 — M8 User Membership Management

import { NextRequest, NextResponse }             from 'next/server'
import { requireSuperAdmin }                     from '@/lib/auth-server'
import { MembershipService_listMemberships }     from '@/lib/services/membership.service'
import type { MembershipListParams }             from '@/lib/types/user-membership.types'

// ─── GET — List memberships ───────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const sp        = req.nextUrl.searchParams
    const role_id_s = sp.get('role_id')

    const params: MembershipListParams = {
      search:    sp.get('search')    ?? undefined,
      tenant_id: sp.get('tenant_id') ?? undefined,
      role_id:   role_id_s ? parseInt(role_id_s, 10) : undefined,
      status:    (sp.get('status') as MembershipListParams['status']) ?? 'all',
      page:      sp.get('page')     ? parseInt(sp.get('page')!,     10) : 1,
      per_page:  sp.get('per_page') ? parseInt(sp.get('per_page')!, 10) : 50,
    }

    const result = await MembershipService_listMemberships(params)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
