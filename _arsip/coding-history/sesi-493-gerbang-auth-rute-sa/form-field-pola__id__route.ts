// app/api/form-field-pola/[id]/route.ts
// PATCH  — SuperAdmin menyunting satu JENIS pola.
// DELETE — soft delete satu JENIS pola. ⛔ Jenis bawaan (`is_system`) TIDAK bisa dihapus;
//          yang benar adalah MEMATIKANNYA lewat `is_active`, sebab kolom formulir yang sudah
//          ada bisa saja masih merujuknya.
//
// Dibuat: Sesi #492 — K-488-T1b.

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import {
  FormFieldPolaRepo_hapus,
  FormFieldPolaRepo_ubah,
} from '@/lib/repositories/form-field-pola.repository'
import { saringPola } from '@/lib/utils/form-field-pola-patch.util'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    const hasil = saringPola(await request.json(), false)
    if (!hasil.ok) {
      return NextResponse.json({ success: false, message: hasil.pesan }, { status: 400 })
    }

    await FormFieldPolaRepo_ubah(id, hasil.isi, auth.uid)
    return NextResponse.json({ success: true })
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal menyimpan perubahan'
    return NextResponse.json({ success: false, message: pesan }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const { id } = await params
    await FormFieldPolaRepo_hapus(id, auth.uid)
    return NextResponse.json({ success: true })
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal menghapus jenis pola'
    return NextResponse.json({ success: false, message: pesan }, { status: 500 })
  }
}
