// app/api/superadmin/tenants/[id]/change-pic/route.ts — PRE-EDIT ARSIP S#180

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import {
  TenantPICService_getTabData,
  TenantPICService_gantiPIC,
  TenantPICService_tambahCadangan,
} from '@/lib/services/tenant-pic.service'
import type { GantiPICPayload } from '@/lib/types/tenant-pic.types'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res
    const { id } = await params
    const data   = await TenantPICService_getTabData(id)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[GET /api/superadmin/tenants/[id]/change-pic] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res
    const { id } = await params
    const body   = await request.json() as GantiPICPayload & {
      action?: 'ganti' | 'cadangan'
      jabatan?: string | null
      relasi_ke_perusahaan?: string
    }
    body.tenant_id = id
    if (body.action === 'cadangan') {
      await TenantPICService_tambahCadangan(
        {
          tenant_id:            id,
          user_name:            body.user_name,
          user_email:           body.user_email,
          user_wa:              body.user_wa,
          jabatan:              body.jabatan ?? null,
          relasi_ke_perusahaan: body.relasi_ke_perusahaan ?? 'lainnya',
        },
        auth.uid
      )
    } else {
      const required = ['user_name', 'user_email', 'user_wa', 'alasan_pergantian', 'tanggal_efektif']
      const missing  = required.filter(f => !body[f as keyof typeof body])
      if (missing.length > 0) {
        return NextResponse.json(
          { success: false, message: `Field wajib belum diisi: ${missing.join(', ')}` },
          { status: 400 }
        )
      }
      await TenantPICService_gantiPIC(body, auth.uid)
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[POST /api/superadmin/tenants/[id]/change-pic] Error:', error)
    const isValidation = ['wajib', 'format', 'retroaktif', 'WA'].some(k => message.includes(k))
    return NextResponse.json(
      { success: false, message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
