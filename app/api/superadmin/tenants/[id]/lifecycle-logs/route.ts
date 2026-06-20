// app/api/superadmin/tenants/[id]/lifecycle-logs/route.ts
// GET — Ambil riwayat lifecycle logs tenant, filter by status_to
// Dipakai oleh: DialogReaktifSuspended (ambil log Non-Active terakhir)
//
// Dibuat: Sesi #303 — FIX B-06 dialog Re-Aktif dari Non-Active

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { classifyHttpError }          from '@/lib/utils/http.server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id }       = await params
    const statusTo     = request.nextUrl.searchParams.get('status_to') ?? undefined

    const supabase = createServerSupabaseClient()

    let query = supabase
      .from('tenant_lifecycle_logs')
      .select('id, status_from, status_to, alasan, changed_by_role, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (statusTo) {
      query = query.eq('status_to', statusTo)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: data ?? [] })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ success: false, message }, { status: classifyHttpError(message) })
  }
}
