// ARSIP — sebelum fix auth (sesi-323-v03-fix-fees-auth)
// app/api/superadmin/tenants/[id]/fees/route.ts
// API Route: GET fee aktif tenant + POST tambah/jadwalkan fee baru
// Dibuat: Sesi #319 — Fee Structure Engine (anti-hardcode)
// Layer: Route → Service → Repository

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  feeService_getAktif,
  feeService_tambah,
} from '@/lib/services/tenant-fee.service'
import type { TambahFeePayload } from '@/lib/types/tenant-fee.types'

// ─── GET /api/superadmin/tenants/[id]/fees ────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id: tenantId } = await params
    const result = await feeService_getAktif(tenantId)

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal memuat data fee'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// ─── POST /api/superadmin/tenants/[id]/fees ───────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id: tenantId } = await params
    const body = await req.json() as TambahFeePayload

    const result = await feeService_tambah(tenantId, body, user.id)

    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Gagal menyimpan fee'
    return NextResponse.json({ success: false, message: msg }, { status: 400 })
  }
}
