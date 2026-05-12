// app/api/superadmin/tenants/[id]/status/route.ts
// PATCH — Update status lifecycle tenant (pending→active, active→suspended, dll)
//
// Body: { status: TenantLifecycleStatus, alasan: string, konfirmasi_nama: string }
// Konfirmasi 2-step: user harus ketik nama tenant untuk aksi suspend/terminate.
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.6

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import {
  TenantService_getById,
  TenantService_updateLifecycleStatus,
} from '@/lib/services/tenant.service'
import type {
  TenantLifecycleStatus,
  UpdateTenantStatusPayload,
} from '@/lib/types/tenant.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── PATCH — Update status lifecycle ─────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body   = await request.json() as UpdateTenantStatusPayload

    if (!body.status) {
      return NextResponse.json(
        { success: false, message: 'Field status wajib diisi' },
        { status: 400 }
      )
    }

    // Konfirmasi 2-step: nama tenant harus diketik ulang untuk suspend/terminate
    const aкsiDangerouus: TenantLifecycleStatus[] = ['suspended', 'terminated']
    if (aкsiDangerouus.includes(body.status)) {
      const tenant = await TenantService_getById(id)
      if (!tenant) {
        return NextResponse.json(
          { success: false, message: 'Tenant tidak ditemukan' },
          { status: 404 }
        )
      }

      const namaInput  = (body.konfirmasi_nama ?? '').trim().toLowerCase()
      const namaTenant = tenant.nama_brand.trim().toLowerCase()

      if (namaInput !== namaTenant) {
        return NextResponse.json(
          { success: false, message: 'Konfirmasi nama tenant tidak cocok. Ketik ulang nama brand dengan benar.' },
          { status: 400 }
        )
      }
    }

    await TenantService_updateLifecycleStatus(
      id,
      body.status,
      body.alasan ?? null,
      auth.uid
    )

    return NextResponse.json({ success: true, data: { new_status: body.status } })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/tenants/[id]/status] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isValidation = ['wajib', 'Tidak bisa', 'Alasan'].some(k => message.includes(k))
    const status = isNotFound ? 404 : isValidation ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
