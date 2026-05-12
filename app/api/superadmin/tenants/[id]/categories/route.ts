// app/api/superadmin/tenants/[id]/categories/route.ts
// GET  — Data Tab Kategori (summary + list assignment + tree untuk dialog assign)
// POST — Assign kategori ke tenant (single atau batch)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.6

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import {
  TCAService_getTabData,
  TCAService_assign,
  TCAService_batchAssign,
} from '@/lib/services/tenant-category-assignment.service'
import { CategoryService_getTreeForAssign } from '@/lib/services/category.service'
import type {
  AssignKategoriPayload,
  BatchAssignPayload,
  AssignmentFilter,
} from '@/lib/types/tenant-category-assignment.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — Tab Kategori ───────────────────────────────────────────────────────
//
// Mode via ?view=:
//   view=tab   → AssignmentTabData (summary + list assignment) — default
//   view=tree  → CategoryTreeNode[] untuk Dialog Assign (dengan status node)

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const { searchParams } = request.nextUrl
    const view = searchParams.get('view') ?? 'tab'

    if (view === 'tree') {
      const data = await CategoryService_getTreeForAssign(id)
      return NextResponse.json({ success: true, data })
    }

    // Default: tab data
    const filter: AssignmentFilter = {}
    const status = searchParams.get('status')
    if (status) filter.status = status as AssignmentFilter['status']

    const data = await TCAService_getTabData(id, filter)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/tenants/[id]/categories] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── POST — Assign kategori ───────────────────────────────────────────────────
//
// Mode via body.mode:
//   mode=single → AssignKategoriPayload (satu kategori)
//   mode=batch  → BatchAssignPayload (beberapa sekaligus)
//   (default = single)

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body   = await request.json() as (AssignKategoriPayload | BatchAssignPayload) & {
      mode?: 'single' | 'batch'
    }

    if (body.mode === 'batch') {
      const batchPayload = body as BatchAssignPayload
      batchPayload.tenant_id = id

      if (!batchPayload.assignments?.length) {
        return NextResponse.json(
          { success: false, message: 'Daftar kategori kosong' },
          { status: 400 }
        )
      }

      const result = await TCAService_batchAssign(batchPayload, auth.uid)
      const status = result.gagal.length === 0 ? 201 : 207
      return NextResponse.json({ success: true, data: result }, { status })
    }

    // Single assign
    const singlePayload = body as AssignKategoriPayload
    singlePayload.tenant_id = id

    if (!singlePayload.category_id) {
      return NextResponse.json(
        { success: false, message: 'category_id wajib diisi' },
        { status: 400 }
      )
    }

    const data = await TCAService_assign(singlePayload, auth.uid)
    return NextResponse.json({ success: true, data }, { status: 201 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[POST /api/superadmin/tenants/[id]/categories] Error:', error)
    const isValidation = ['wajib', 'komisi', 'sudah', 'tidak ditemukan'].some(k => message.includes(k))
    return NextResponse.json(
      { success: false, message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
