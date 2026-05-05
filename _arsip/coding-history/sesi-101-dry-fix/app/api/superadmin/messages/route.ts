// ARSIP sesi-101-dry-fix — app/api/superadmin/messages/route.ts
// Sebelum: ganti authSuperAdmin() lokal → requireSuperAdmin() shared dari lib/auth-server
// + ganti query DB langsung → MessageLibraryService_getAllForAdmin()
import { NextRequest, NextResponse }  from 'next/server'
import { revalidateTag }              from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { MessageItem }           from '@/lib/message-library'

async function authSuperAdmin(): Promise<{ ok: true; uid: string } | { ok: false; res: NextResponse }> {
  const decoded = await verifyJWT()
  if (!decoded) return { ok: false, res: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }) }
  if (decoded.role !== 'SUPERADMIN') return { ok: false, res: NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 }) }
  return { ok: true, uid: decoded.uid }
}

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await authSuperAdmin()
    if (!auth.ok) return auth.res
    const db = createServerSupabaseClient()
    const { data, error } = await db.from('message_library').select('id, key, kategori, channel, teks, variabel, keterangan, is_active, updated_at, updated_by').order('kategori', { ascending: true }).order('key', { ascending: true })
    if (error) return NextResponse.json({ success: false, message: 'Gagal memuat pesan' }, { status: 500 })
    return NextResponse.json({ success: true, data: data as MessageItem[] })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

interface PostBody { key: string; kategori: string; channel?: string; teks: string; variabel?: string[]; keterangan?: string }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authSuperAdmin()
    if (!auth.ok) return auth.res
    const body = await request.json() as PostBody
    if (!body.key?.trim() || !body.kategori?.trim() || !body.teks?.trim()) return NextResponse.json({ success: false, message: 'Field key, kategori, dan teks wajib diisi' }, { status: 400 })
    if (!/^[a-z0-9_]+$/.test(body.key)) return NextResponse.json({ success: false, message: 'Format key tidak valid.' }, { status: 400 })
    const db = createServerSupabaseClient()
    const { data: existing } = await db.from('message_library').select('id').eq('key', body.key).single()
    if (existing) return NextResponse.json({ success: false, message: 'Key ini sudah dipakai.' }, { status: 409 })
    const variabel = body.variabel ?? (body.teks.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) ?? [])
    const { data: inserted, error } = await db.from('message_library').insert({ key: body.key.trim(), kategori: body.kategori.trim(), channel: body.channel ?? 'ui', teks: body.teks.trim(), variabel, keterangan: body.keterangan?.trim() ?? null, updated_by: auth.uid }).select().single()
    if (error) return NextResponse.json({ success: false, message: 'Gagal menyimpan: ' + error.message }, { status: 500 })
    revalidateTag('messages', 'max')
    revalidateTag(`messages:${body.kategori}`, 'max')
    return NextResponse.json({ success: true, data: inserted }, { status: 201 })
  } catch { return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 }) }
}
