// app/api/superadmin/usage/check/route.ts
// GET — Ambil info pemakaian item (safety verdict + breakdown + dependency list)
// Dipanggil panel "Pemetaan Pemakaian" saat dibuka SuperAdmin di dashboard.
//
// Query params:
//   table : string — nama tabel sumber (cth: master_dropdown_options)
//   id    : string — UUID item spesifik (opsional)
//
// Dipanggil oleh: UsageTrackingPanel.tsx
// SP yang dipakai: sp_check_usage(p_source_table, p_source_id)
//
// Dibuat: Sesi #121 — PL-S12 Shared UI + API Routes USAGE_TRACKING

import { NextRequest, NextResponse }           from 'next/server'
import { requireSuperAdmin }                   from '@/lib/auth-server'
import { UsageTrackingService_checkUsage }     from '@/lib/services/usage-tracking.service'

// ─── GET — Cek pemakaian item ─────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = request.nextUrl
    const sourceTable = searchParams.get('table')
    const sourceId    = searchParams.get('id') ?? undefined

    if (!sourceTable) {
      return NextResponse.json(
        { success: false, message: 'Query param "table" wajib diisi' },
        { status: 400 }
      )
    }

    const data = await UsageTrackingService_checkUsage(sourceTable, sourceId)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/usage/check] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
