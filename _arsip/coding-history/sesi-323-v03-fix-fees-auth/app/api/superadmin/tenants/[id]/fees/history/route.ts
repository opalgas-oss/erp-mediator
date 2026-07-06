// ARSIP — sebelum fix auth (sesi-323-v03-fix-fees-auth)
// app/api/superadmin/tenants/[id]/fees/history/route.ts
// API Route: GET riwayat fee tenant (immutable audit trail)
// Dibuat: Sesi #319 — Fee Structure Engine (anti-hardcode)

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { feeService_getHistory }     from '@/lib/services/tenant-fee.service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id: tenantId } = await params
    const searchParams = req.nextUrl.searchParams
    const limit  = parseInt(searchParams.get('limit')  ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0',  10)

    const result = await feeService_getHistory(tenantId, limit, offset)

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal memuat riwayat fee'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
