// app/api/superadmin/tenants/[id]/change-pic/cadangan/route.ts
// PATCH  — Update in-place data PIC cadangan aktif (EDIT, bukan pergantian)
// DELETE — Hapus PIC cadangan aktif tenant (set ended_at = now)
//
// Dibuat: Sesi #147 — HUTANG-02 M6 Tenant Management

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import {
  TenantPICService_hapusCadangan,
  TenantPICService_updateCadangan,
} from '@/lib/services/tenant-pic.service'

type RouteContext = { params: Promise<{ id: string }> }

// --- PATCH — Update in-place PIC cadangan -----------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body   = await request.json() as {
      user_name?:            string
      user_email?:           string
      user_wa?:              string
      jabatan?:              string | null
      relasi_ke_perusahaan?: string
    }

    const required = ['user_name', 'user_email', 'user_wa', 'relasi_ke_perusahaan']
    const missing  = required.filter(f => !body[f as keyof typeof body])
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, message: `Field wajib belum diisi: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    await TenantPICService_updateCadangan(id, {
      user_name:            body.user_name!,
      user_email:           body.user_email!,
      user_wa:              body.user_wa!,
      jabatan:              body.jabatan ?? null,
      relasi_ke_perusahaan: body.relasi_ke_perusahaan!,
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/tenants/[id]/change-pic/cadangan] Error:', error)
    const isValidation = ['wajib', 'format', 'WA', 'tidak memiliki PIC cadangan'].some(k => message.includes(k))
    return NextResponse.json(
      { success: false, message },
      { status: isValidation ? 400 : 500 }
    )
  }
}

// --- DELETE — Hapus PIC cadangan --------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    await TenantPICService_hapusCadangan(id)

    return NextResponse.json({ success: true })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[DELETE /api/superadmin/tenants/[id]/change-pic/cadangan] Error:', error)
    const isValidation = message.includes('tidak memiliki PIC cadangan')
    return NextResponse.json(
      { success: false, message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
