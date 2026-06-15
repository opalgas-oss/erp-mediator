// app/api/superadmin/dashboard-menus/route.ts
// GET — Ambil daftar menu dari katalog dashboard_menus per role_scope.
// Query param: ?scope=<role_scope>  (wajib)
// Returns: { success, data: { id, menuKey, parentId, isPjOnly }[] }
//
// Dipakai oleh TabAksesMenuAT untuk membangun menuKey → uuid map saat menyimpan ceiling.
//
// Dibuat: CASE SESI-27 — A-F9 UI Ceiling SA
//
// UPDATE S#282 — Tambah PATCH handler:
//   Force-invalidate Vercel Data Cache tag 'dashboard-menus:super_admin'.
//   Diperlukan saat perubahan dashboard_menus dilakukan langsung via DB
//   (tanpa lewat UI SA) sehingga revalidateTag tidak terpanggil otomatis.
//   SA-only. Tidak butuh body.

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag }             from 'next/cache'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const scope = request.nextUrl.searchParams.get('scope')
    if (!scope) {
      return NextResponse.json(
        { success: false, message: 'Query param scope wajib diisi' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('dashboard_menus')
      .select('id, menu_key, parent_id, is_pj_only')
      .eq('role_scope', scope)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: (data ?? []).map(r => ({
        id:        r.id,
        menuKey:   r.menu_key,
        parentId:  r.parent_id,
        isPjOnly:  r.is_pj_only,
      })),
    })

  } catch (error) {
    console.error('[GET /api/superadmin/dashboard-menus]', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/superadmin/dashboard-menus
// Force-invalidate cache sidebar menu SA.
// SA-only. Tidak butuh body.
export async function PATCH(_request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    revalidateTag('dashboard-menus:super_admin', 'default')

    return NextResponse.json({
      success: true,
      message: 'Cache sidebar SA berhasil diinvalidasi. Refresh browser untuk melihat perubahan.',
    })
  } catch (error) {
    console.error('[PATCH /api/superadmin/dashboard-menus]', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
