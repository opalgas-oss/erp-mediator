// app/api/superadmin/memberships/[uid]/revoke/[membershipId]/route.ts
// PATCH — Revoke membership (soft delete: status → inactive) (SuperAdmin only)
//
// Response: { success: true, is_last_membership: boolean }
// is_last_membership = true → UI menampilkan warning user tidak bisa login
//
// Dibuat: Sesi #136 — M8 User Membership Management

import { NextResponse }                     from 'next/server'
import { requireSuperAdmin }                from '@/lib/auth-server'
import { MembershipService_revokeRole }     from '@/lib/services/membership.service'

// ─── PATCH — Revoke membership ────────────────────────────────────────────────

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ uid: string; membershipId: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { uid, membershipId } = await params

    const result = await MembershipService_revokeRole(uid, membershipId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    const status  = message.includes('tidak ditemukan') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
