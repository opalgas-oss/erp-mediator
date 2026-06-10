// app/api/superadmin/tenants/[id]/ceiling/route.ts
// GET  — Ambil state ceiling menu AT untuk satu tenant
// POST — Simpan perubahan ceiling (batch upsert)
//
// Dibuat: CASE SESI-27 — A-F9 UI Ceiling SA

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — State ceiling menu AT untuk tenant ──────────────────────────────────
// Returns: { success, data: { menuId, isActive }[] }

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id: tenantId } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('tenant_menu_ceilings')
      .select('menu_id, is_active')
      .eq('tenant_id', tenantId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: (data ?? []).map(r => ({ menuId: r.menu_id, isActive: r.is_active })),
    })

  } catch (error) {
    console.error('[GET /api/superadmin/tenants/[id]/ceiling]', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── POST — Simpan perubahan ceiling (batch upsert) ───────────────────────────
// Body: { items: { menuId: string; isActive: boolean }[] }
// Semantik: SA kirim state penuh semua menu AT untuk tenant ini.
// Upsert by (tenant_id, menu_id) — insert jika belum ada, update is_active jika sudah ada.

export async function POST(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id: tenantId } = await params
    const body: { items: { menuId: string; isActive: boolean }[] } = await request.json()

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'items wajib diisi dan tidak boleh kosong' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const now = new Date().toISOString()

    const rows = body.items.map(item => ({
      tenant_id:  tenantId,
      menu_id:    item.menuId,
      is_active:  item.isActive,
      created_by: auth.uid,
      updated_at: now,
      updated_by: auth.uid,
    }))

    const { error } = await supabase
      .from('tenant_menu_ceilings')
      .upsert(rows, { onConflict: 'tenant_id,menu_id' })

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[POST /api/superadmin/tenants/[id]/ceiling]', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
