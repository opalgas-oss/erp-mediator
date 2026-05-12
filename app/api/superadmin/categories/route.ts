// app/api/superadmin/categories/route.ts
// GET  — List semua kategori dengan stats (halaman List Categories 8.3)
// POST — Buat root kategori atau sub-kategori baru
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.6

import { NextRequest, NextResponse }   from 'next/server'
import { requireSuperAdmin }            from '@/lib/auth-server'
import {
  CategoryService_list,
  CategoryService_buatRoot,
  CategoryService_buatSub,
  CategoryService_cekSlug,
  CategoryService_generateSlug,
} from '@/lib/services/category.service'
import type {
  CategoryListFilter,
  BuatRootCategoryPayload,
  BuatSubCategoryPayload,
} from '@/lib/types/category.types'

// ─── GET — List kategori ──────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { searchParams } = request.nextUrl
    const action = searchParams.get('action')

    // Mode: cek slug (?action=check-slug&slug=xxx)
    if (action === 'check-slug') {
      const slug      = searchParams.get('slug') ?? ''
      const excludeId = searchParams.get('exclude_id') ?? undefined
      const result    = await CategoryService_cekSlug(slug, excludeId)
      return NextResponse.json({ success: true, data: result })
    }

    // Mode: generate slug (?action=gen-slug&name=xxx&parent_slug=yyy)
    if (action === 'gen-slug') {
      const name       = searchParams.get('name') ?? ''
      const parentSlug = searchParams.get('parent_slug') ?? undefined
      const slug       = CategoryService_generateSlug(name, parentSlug)
      return NextResponse.json({ success: true, data: { slug } })
    }

    const filter: CategoryListFilter = {}

    const level = searchParams.get('level')
    if (level) filter.level = parseInt(level, 10) as 1 | 2

    // 'status' query param → boolean is_active (active=true, inactive=false)
    const status = searchParams.get('status')
    if (status === 'active')   filter.is_active = true
    if (status === 'inactive') filter.is_active = false

    const search = searchParams.get('search')
    if (search) filter.search = search

    const page = searchParams.get('page')
    if (page) filter.page = parseInt(page, 10)

    const limit = searchParams.get('limit')
    if (limit) filter.limit = parseInt(limit, 10)

    const data = await CategoryService_list(filter)
    return NextResponse.json({ success: true, ...data })

  } catch (error) {
    console.error('[GET /api/superadmin/categories] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── POST — Buat kategori baru ────────────────────────────────────────────────
//
// Mode via body.level:
//   level=1 (atau tidak ada parent_id) → root kategori (BuatRootCategoryPayload)
//   level=2 (ada parent_id)            → sub-kategori (BuatSubCategoryPayload)

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as
      (BuatRootCategoryPayload | BuatSubCategoryPayload) & { level?: number }

    if (!body.display_name || !body.slug) {
      return NextResponse.json(
        { success: false, message: 'Field display_name dan slug wajib diisi' },
        { status: 400 }
      )
    }

    const isRoot = !('parent_id' in body) || !(body as BuatSubCategoryPayload).parent_id

    let data
    if (isRoot) {
      data = await CategoryService_buatRoot(
        body as BuatRootCategoryPayload,
        auth.uid
      )
    } else {
      data = await CategoryService_buatSub(
        body as BuatSubCategoryPayload,
        auth.uid
      )
    }

    return NextResponse.json({ success: true, data }, { status: 201 })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[POST /api/superadmin/categories] Error:', error)
    const isValidation = [
      'wajib', 'Slug', 'karakter', 'huruf', 'sudah digunakan', 'induk', 'diawali',
    ].some(k => message.includes(k))
    return NextResponse.json(
      { success: false, message },
      { status: isValidation ? 400 : 500 }
    )
  }
}
