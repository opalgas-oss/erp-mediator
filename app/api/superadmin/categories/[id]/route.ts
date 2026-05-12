// app/api/superadmin/categories/[id]/route.ts
// GET    — Detail satu kategori
// PATCH  — Update kategori (display_name, deskripsi, warna, ikon, urutan)
// DELETE — Hapus kategori (soft delete — cascade ke sub jika root)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.6

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }           from '@/lib/auth-server'
import {
  CategoryService_getById,
  CategoryService_update,
  CategoryService_hapus,
} from '@/lib/services/category.service'
import type { UpdateCategoryPayload } from '@/lib/types/category.types'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — Detail kategori ────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const data   = await CategoryService_getById(id)

    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Kategori tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/categories/[id]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── PATCH — Update kategori ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const body   = await request.json() as UpdateCategoryPayload

    const data = await CategoryService_update(id, body, auth.uid)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[PATCH /api/superadmin/categories/[id]] Error:', error)
    const isNotFound   = message.includes('tidak ditemukan')
    const isValidation = ['wajib', 'Slug', 'karakter', 'sudah digunakan'].some(k => message.includes(k))
    const status = isNotFound ? 404 : isValidation ? 400 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}

// ─── DELETE — Hapus kategori ──────────────────────────────────────────────────
//
// Soft delete. Guard di service:
//   - Tidak bisa hapus jika ada assignment aktif (active/suspended/pending_handover)
//   - Jika root: cascade soft delete semua sub-kategori yang tidak punya assignment aktif

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    await CategoryService_hapus(id, auth.uid)

    return NextResponse.json({ success: true })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    console.error('[DELETE /api/superadmin/categories/[id]] Error:', error)
    const isNotFound = message.includes('tidak ditemukan')
    const isBlocked  = message.includes('masih dipegang')
    const status = isNotFound ? 404 : isBlocked ? 409 : 500
    return NextResponse.json({ success: false, message }, { status })
  }
}
