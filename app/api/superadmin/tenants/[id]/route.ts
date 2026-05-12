// app/api/superadmin/tenants/[id]/route.ts
// GET   — Detail tenant lengkap (semua field, 6 tab)
// PATCH — Update info tenant (partial update per cluster Tab Info Umum + Tab Kontrak Sewa)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.6

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import {
  TenantService_getById,
  TenantService_update,
  TenantService_updateContract,
} from '@/lib/services/tenant.service'
import type {
  UpdateTenantInfoPayload,
  TenantContractStatus,
} from '@/lib/types/tenant.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — Detail tenant ─────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const data = await TenantService_getById(id)

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Tenant tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/tenants/[id]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── PATCH — Update info tenant ───────────────────────────────────────────────
//
// Dua mode via query param ?section=:
//   section=info     → update field Tab Info Umum (UpdateTenantInfoPayload)
//   section=contract → update field Tab Kontrak Sewa
//   (default = info)

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id }    = await params
    const { searchParams } = request.nextUrl
    const section   = searchParams.get('section') ?? 'info'
    const body      = await request.json()

    if (section === 'contract') {
      const contractInput: {
        contract_start_date?:   string | null
        contract_end_date?:     string | null
        contract_file_url?:     string | null
        contract_signed?:       boolean
        contract_status?:       TenantContractStatus
        auto_renewal?:          boolean
        renewal_notice_days?:   number
        early_termination_fee?: number | null
      } = body

      await TenantService_updateContract(id, contractInput, auth.uid)
    } else {
      const infoInput = body as UpdateTenantInfoPayload
      await TenantService_update(id, infoInput, auth.uid)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/tenants/[id]] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isValidation = ['wajib', 'format', 'karakter', 'harus', 'NPWP', 'WA'].some(k => message.includes(k))
    const status = isNotFound ? 404 : isValidation ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
