// app/api/superadmin/usage/safety-status/route.ts
// GET — Ambil verdict semua item dari tabel cache registry_safety_status
//       untuk satu source_table sekaligus (bulk fetch).
//
// Query params:
//   source_table : string — nama tabel yang dicari (cth: master_dropdown_options)
//
// Return: { success: true, data: SafetyStatusResult[] }
//   - Setiap item punya safety_verdict + count breakdown
//   - Item dengan 0 dep TIDAK ada di response — UI perlakukan sebagai AMAN
//
// Menggantikan: 50+ per-item call ke GET /api/superadmin/usage/check
// Performance: O(1) query ke tabel cache vs N×O(sp_check_usage) sebelumnya
//
// Dibuat: Sesi #124 — Redesign USAGE_TRACKING dengan pendekatan tabel cache

import { NextRequest, NextResponse }                  from 'next/server'
import { requireSuperAdmin }                           from '@/lib/auth-server'
import { UsageTrackingService_getSafetyStatusBulk }   from '@/lib/services/usage-tracking.service'

// ─── GET — Bulk fetch safety status dari cache ────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = request.nextUrl
    const sourceTable = searchParams.get('source_table')

    if (!sourceTable) {
      return NextResponse.json(
        { success: false, message: 'Query param "source_table" wajib diisi' },
        { status: 400 }
      )
    }

    const data = await UsageTrackingService_getSafetyStatusBulk(sourceTable)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/usage/safety-status] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
