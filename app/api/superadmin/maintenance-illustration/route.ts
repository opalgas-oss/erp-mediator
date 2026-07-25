// app/api/superadmin/maintenance-illustration/route.ts
// POST — Upload gambar ilustrasi halaman maintenance ke Supabase Storage (bucket maintenance-assets).
// Hanya SuperAdmin. Return URL publik → disimpan sebagai nilai config maintenance_illustration.
// Route di bawah /api/superadmin/* → middleware Guard 6 inject header auth → requireSuperAdmin() valid.
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA field maintenance_illustration (anti-hardcode: file→Storage).

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const BUCKET    = 'maintenance-assets'
const ALLOWED   = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Tipe file tidak didukung (png/jpg/webp/svg/gif)' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: 'Ukuran file maksimal 2 MB' }, { status: 400 })
    }

    const ext   = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path  = `illustration/maintenance-${Date.now()}.${ext}`
    const bytes = new Uint8Array(await file.arrayBuffer())

    const db = createServerSupabaseClient()
    const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert:      false,
    })

    if (error) {
      console.error('[POST /api/superadmin/maintenance-illustration] upload error:', error.message)
      return NextResponse.json({ success: false, message: 'Gagal upload: ' + error.message }, { status: 500 })
    }

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ success: true, url: pub.publicUrl })

  } catch (err) {
    console.error('[POST /api/superadmin/maintenance-illustration] error:', err)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
