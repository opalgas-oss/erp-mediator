// app/api/superadmin/usage/register/route.ts
// POST — Daftarkan dependency baru ke registry_dependencies.
// SP sudah punya guard duplikat — aman dipanggil lebih dari sekali.
//
// Body: RegisterDependencyPayload
//   source_table, source_id?, consumer_module_id, consumer_table,
//   consumer_column, reference_type, lifecycle_status?, description?
//
// SP yang dipakai: sp_register_dependency(...)
//
// Dibuat: Sesi #121 — PL-S12 Shared UI + API Routes USAGE_TRACKING

import { NextRequest, NextResponse }                  from 'next/server'
import { requireSuperAdmin }                          from '@/lib/auth-server'
import { UsageTrackingService_registerDependency }    from '@/lib/services/usage-tracking.service'
import type { RegisterDependencyPayload }             from '@/lib/types/usage-tracking.types'

// ─── POST — Daftarkan dependency baru ────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as RegisterDependencyPayload

    // Validasi field wajib di route layer
    if (!body.source_table || !body.consumer_module_id ||
        !body.consumer_table || !body.consumer_column || !body.reference_type) {
      return NextResponse.json(
        {
          success: false,
          message: 'Field source_table, consumer_module_id, consumer_table, consumer_column, reference_type wajib diisi',
        },
        { status: 400 }
      )
    }

    const result = await UsageTrackingService_registerDependency(body, auth.uid)
    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('[POST /api/superadmin/usage/register] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
