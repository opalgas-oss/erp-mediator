// app/api/superadmin/providers/route.ts
// POST — Tambah provider baru dari dashboard SA (SuperAdmin only)
// Dibuat: Sesi #218 — fitur Tambah Provider

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { tambahProvider }             from '@/lib/services/credential.service'
import type { TambahProviderPayload } from '@/lib/types/provider.types'

const KATEGORI_VALID = new Set([
  'email', 'messaging', 'payment', 'media', 'cache',
  'database', 'search', 'cdn', 'management', 'queue',
])

const TAG_VALID = new Set(['wajib', 'disarankan', 'opsional'])

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const body = await request.json() as TambahProviderPayload

    // Validasi wajib
    if (!body.nama?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama provider wajib diisi' },
        { status: 400 }
      )
    }

    if (!body.kategori || !KATEGORI_VALID.has(body.kategori)) {
      return NextResponse.json(
        { success: false, message: 'Kategori tidak valid' },
        { status: 400 }
      )
    }

    if (!body.tag || !TAG_VALID.has(body.tag)) {
      return NextResponse.json(
        { success: false, message: 'Tag tidak valid' },
        { status: 400 }
      )
    }

    // field_defs boleh kosong array — validasi tiap field jika ada
    const fieldDefs = Array.isArray(body.field_defs) ? body.field_defs : []
    for (const fd of fieldDefs) {
      if (!fd.label?.trim()) {
        return NextResponse.json(
          { success: false, message: 'Label field tidak boleh kosong' },
          { status: 400 }
        )
      }
      if (!fd.field_key?.trim()) {
        return NextResponse.json(
          { success: false, message: 'Key field tidak boleh kosong' },
          { status: 400 }
        )
      }
    }

    const provider = await tambahProvider(
      {
        nama:       body.nama.trim(),
        kategori:   body.kategori,
        tag:        body.tag,
        deskripsi:  body.deskripsi?.trim() || null,
        docs_url:   body.docs_url?.trim()  || null,
        field_defs: fieldDefs,
      },
      auth.uid
    )

    return NextResponse.json({ success: true, data: provider }, { status: 201 })

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Server error'

    // Kode duplikat — beri pesan yang jelas ke SA
    if (msg.startsWith('KODE_DUPLIKAT:')) {
      return NextResponse.json(
        { success: false, message: 'Nama provider menghasilkan kode yang sudah dipakai. Coba nama yang berbeda.' },
        { status: 409 }
      )
    }

    console.error('[POST /api/superadmin/providers] Error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
