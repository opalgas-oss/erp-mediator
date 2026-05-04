// app/api/superadmin/messages/[id]/route.ts
// PATCH — Edit teks/keterangan pesan di message_library (SuperAdmin only)
//
// Catatan: key dan kategori TIDAK bisa diubah via API ini —
// key adalah identifier yang dipakai di kode.
// Jika key harus berubah → harus via migrasi DB.
//
// Dibuat: Sesi #098 — PL-S08 M2 Message Library

import { NextRequest, NextResponse }  from 'next/server'
import { revalidateTag }              from 'next/cache'
import { verifyJWT }                  from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ─── PATCH — Edit teks dan/atau keterangan pesan ─────────────────────────────

interface PatchBody {
  teks?:       string
  keterangan?: string
  is_active?:  boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Autentikasi — hanya SUPERADMIN
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    if (decoded.role !== 'SUPERADMIN') {
      return NextResponse.json({ success: false, message: 'Akses ditolak' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID pesan wajib diisi' }, { status: 400 })
    }

    const body = await request.json() as PatchBody

    // Minimal satu field harus diisi
    if (body.teks === undefined && body.keterangan === undefined && body.is_active === undefined) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada perubahan yang dikirim' },
        { status: 400 }
      )
    }

    // Validasi teks tidak boleh kosong jika disuplai
    if (body.teks !== undefined && !body.teks.trim()) {
      return NextResponse.json(
        { success: false, message: 'Teks pesan tidak boleh kosong' },
        { status: 400 }
      )
    }

    const db = createServerSupabaseClient()

    // Ambil kategori dulu — untuk revalidateTag yang presisi
    const { data: existing, error: fetchError } = await db
      .from('message_library')
      .select('id, kategori')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, message: 'Pesan tidak ditemukan' }, { status: 404 })
    }

    // Bangun payload update — hanya field yang disuplai
    const updatePayload: Record<string, unknown> = { updated_by: decoded.uid }
    if (body.teks       !== undefined) updatePayload.teks       = body.teks.trim()
    if (body.keterangan !== undefined) updatePayload.keterangan = body.keterangan?.trim() ?? null
    if (body.is_active  !== undefined) updatePayload.is_active  = body.is_active

    // Jika teks berubah — update kolom variabel otomatis dari isi teks baru
    if (body.teks !== undefined) {
      const variabelFromTeks = body.teks.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) ?? []
      updatePayload.variabel = variabelFromTeks
    }

    // UPDATE
    const { data: updated, error: updateError } = await db
      .from('message_library')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/superadmin/messages] DB error:', updateError.message)
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan perubahan: ' + updateError.message },
        { status: 500 }
      )
    }

    // Invalidasi cache
    revalidateTag('messages', 'max')
    revalidateTag(`messages:${existing.kategori}`, 'max')

    return NextResponse.json({ success: true, data: updated })

  } catch (error) {
    console.error('[PATCH /api/superadmin/messages/[id]] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
