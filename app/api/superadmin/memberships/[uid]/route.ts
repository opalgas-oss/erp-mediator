// app/api/superadmin/memberships/[uid]/route.ts
// GET — Ambil info user + semua membership-nya (SuperAdmin only)
//
// Dibuat: Sesi #136 — M8 User Membership Management

import { NextResponse }                           from 'next/server'
import { requireSuperAdmin }                      from '@/lib/auth-server'
import { MembershipService_getUserMemberships }   from '@/lib/services/membership.service'

// ─── GET — Detail user + memberships ─────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { uid } = await params

    const result = await MembershipService_getUserMemberships(uid)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    const status  = message.includes('tidak ditemukan') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
