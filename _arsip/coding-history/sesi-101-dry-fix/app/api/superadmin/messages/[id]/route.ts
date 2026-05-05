// ARSIP sesi-101-dry-fix — app/api/superadmin/messages/[id]/route.ts
// Sebelum: ganti inline auth check → requireSuperAdmin() shared dari lib/auth-server
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { verifyJWT } from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
interface PatchBody { teks?: string; keterangan?: string; is_active?: boolean }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const decoded = await verifyJWT()
    if (!decoded) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    if (decoded.role !== 'SUPERADMIN') return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 })
    const { id } = await params
    if (!id) return NextResponse.json({ success: false, message: 'ID pesan wajib diisi' }, { status: 400 })
    const body = await request.json() as PatchBody
    if (body.teks === undefined && body.keterangan === undefined && body.is_active === undefined) return NextResponse.json({ success: false, message: 'Tidak ada perubahan yang dikirim' }, { status: 400 })
    if (body.teks !== undefined && !body.teks.trim()) return NextResponse.json({ success: false, message: 'Teks pesan tidak boleh kosong' }, { status: 400 })
    const db = createServerSupabaseClient()
    const { data: existing, error: fetchError } = await db.from('message_library').select('id, kategori').eq('id', id).single()
    if (fetchError || !existing) return NextResponse.json({ success: false, message: 'Pesan tidak ditemukan' }, { status: 404 })
    const updatePayload: Record<string, unknown> = { updated_by: decoded.uid }
    if (body.teks !== undefined) { updatePayload.teks = body.teks.trim(); updatePayload.variabel = body.teks.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) ?? [] }
    if (body.keterangan !== undefined) updatePayload.keterangan = body.keterangan?.trim() ?? null
    if (body.is_active !== undefined) updatePayload.is_active = body.is_active
    const { data: updated, error: updateError } = await db.from('message_library').update(updatePayload).eq('id', id).select().single()
    if (updateError) return NextResponse.json({ success: false, message: 'Gagal menyimpan: ' + updateError.message }, { status: 500 })
    revalidateTag('messages', 'max')
    revalidateTag(`messages:${existing.kategori}`, 'max')
    return NextResponse.json({ success: true, data: updated })
  } catch { return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 }) }
}
