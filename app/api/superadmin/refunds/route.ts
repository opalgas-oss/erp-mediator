// app/api/superadmin/refunds/route.ts
// GET — List complaints menunggu approval SuperAdmin (awaiting_super_admin)
//
// Query params:
//   search    — cari by subject atau nama customer
//   tenant_id — filter by tenant
//   page      — default 1
//   per_page  — default 20
//
// Dibuat: Sesi #137 — M9 Approval Refund SuperAdmin

import { NextRequest, NextResponse }            from 'next/server'
import { requireSuperAdmin }                    from '@/lib/auth-server'
import { ComplaintService_listRefunds }         from '@/lib/services/complaint.service'
import type { RefundListParams }                from '@/lib/types/complaint.types'

// ─── GET — List refunds awaiting SuperAdmin ───────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const sp = req.nextUrl.searchParams

    const params: RefundListParams = {
      search:    sp.get('search')    ?? undefined,
      tenant_id: sp.get('tenant_id') ?? undefined,
      page:      sp.get('page')     ? parseInt(sp.get('page')!,     10) : 1,
      per_page:  sp.get('per_page') ? parseInt(sp.get('per_page')!, 10) : 20,
    }

    const result = await ComplaintService_listRefunds(params)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
