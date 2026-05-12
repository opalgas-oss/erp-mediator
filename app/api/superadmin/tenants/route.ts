// app/api/superadmin/tenants/route.ts
// GET  — List semua tenant dengan filter + pagination
// POST — Buat tenant baru (minimal: nama, slug, tipe, NPWP, PIC awal)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.6

import { NextRequest, NextResponse }    from 'next/server'
import { requireSuperAdmin }             from '@/lib/auth-server'
import {
  TenantService_list,
  TenantService_create,
  TenantService_checkSlugAvailable,
} from '@/lib/services/tenant.service'
import type {
  TenantListFilter,
  TenantLifecycleStatus,
  TenantTipe,
  TenantTier,
  BuatTenantPayload,
} from '@/lib/types/tenant.types'

// ─── GET — List tenant ────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = request.nextUrl
    const action = searchParams.get('action')

    // Mode: cek ketersediaan slug (?action=check-slug&slug=xxx)
    if (action === 'check-slug') {
      const slug = searchParams.get('slug') ?? ''
      const result = await TenantService_checkSlugAvailable(slug)
      return NextResponse.json({ success: true, data: result })
    }

    const filter: TenantListFilter = {}

    const status = searchParams.get('status')
    if (status) filter.status = status as TenantLifecycleStatus | 'all'

    const tipe = searchParams.get('tipe')
    if (tipe) filter.tipe = tipe as TenantTipe

    const tier = searchParams.get('tier')
    if (tier) filter.tier = tier as TenantTier

    const search = searchParams.get('search')
    if (search) filter.search = search

    const page = searchParams.get('page')
    if (page) filter.page = parseInt(page, 10)

    const limit = searchParams.get('limit')
    if (limit) filter.limit = parseInt(limit, 10)

    const data = await TenantService_list(filter)
    return NextResponse.json({ success: true, ...data })

  } catch (error) {
    console.error('[GET /api/superadmin/tenants] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── POST — Buat tenant baru ─────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as BuatTenantPayload

    const required = ['nama_brand', 'nama_legal', 'slug', 'tipe', 'npwp', 'pic_name', 'pic_email', 'pic_wa']
    const missing  = required.filter(f => !body[f as keyof BuatTenantPayload])
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, message: `Field wajib belum diisi: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    const data = await TenantService_create(body, auth.uid)
    return NextResponse.json({ success: true, data }, { status: 201 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[POST /api/superadmin/tenants] Error:', error)
    const isValidation = [
      'wajib', 'format', 'karakter', 'sudah digunakan', 'NPWP', 'WA',
    ].some(k => message.includes(k))
    return NextResponse.json(
      { success: false, message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
