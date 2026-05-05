// app/api/superadmin/messages/route.ts
// GET  — Ambil semua pesan dari message_library (SuperAdmin only)
// POST — Tambah pesan baru ke message_library (SuperAdmin only)
//
// Berbeda dari /api/message-library (publik per kategori),
// endpoint ini khusus SuperAdmin — mengembalikan semua kolom untuk keperluan CRUD.
//
// Dibuat: Sesi #098 — PL-S08 M2 Message Library
// Updated: Sesi #101 — DRY fix: ganti authSuperAdmin() lokal → requireSuperAdmin() shared
//                                ganti query DB langsung → MessageLibraryService_getAllForAdmin()

import { NextRequest, NextResponse }           from 'next/server'
import { revalidateTag }                       from 'next/cache'
import { requireSuperAdmin }                   from '@/lib/auth-server'
import { MessageLibraryService_getAllForAdmin } from '@/lib/services/message-library.service'
import { createServerSupabaseClient }          from '@/lib/supabase-server'
import type { MessageItem }                    from '@/lib/message-library'

// ─── GET — Semua pesan (untuk halaman CRUD SuperAdmin) ───────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const data = await MessageLibraryService_getAllForAdmin()
    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/superadmin/messages] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// ─── POST — Tambah pesan baru ─────────────────────────────────────────────────

interface PostBody {
  key:         string
  kategori:    string
  channel?:    string
  teks:        string
  variabel?:   string[]
  keterangan?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as PostBody

    // Validasi wajib
    if (!body.key?.trim() || !body.kategori?.trim() || !body.teks?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Field key, kategori, dan teks wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi format key: lowercase, underscore, tanpa spasi
    if (!/^[a-z0-9_]+$/.test(body.key)) {
      return NextResponse.json(
        { success: false, message: 'Format key tidak valid. Gunakan huruf kecil, angka, dan underscore.' },
        { status: 400 }
      )
    }

    const db = createServerSupabaseClient()

    // Cek duplikasi key
    const { data: existing } = await db
      .from('message_library')
      .select('id')
      .eq('key', body.key)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Key ini sudah dipakai. Gunakan key yang berbeda.' },
        { status: 409 }
      )
    }

    // Ekstrak variabel dari teks jika tidak disuplai
    const variabelFromTeks = body.teks.match(/\{(\w+)\}/g)?.map(v => v.slice(1, -1)) ?? []
    const variabel = body.variabel ?? variabelFromTeks

    // INSERT
    const { data: inserted, error } = await db
      .from('message_library')
      .insert({
        key:        body.key.trim(),
        kategori:   body.kategori.trim(),
        channel:    body.channel ?? 'ui',
        teks:       body.teks.trim(),
        variabel,
        keterangan: body.keterangan?.trim() ?? null,
        updated_by: auth.uid,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/superadmin/messages] DB error:', error.message)
      return NextResponse.json(
        { success: false, message: 'Gagal menyimpan pesan: ' + error.message },
        { status: 500 }
      )
    }

    // Invalidasi cache messages
    revalidateTag('messages', 'max')
    revalidateTag(`messages:${body.kategori}`, 'max')

    return NextResponse.json({ success: true, data: inserted as MessageItem }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/superadmin/messages] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
