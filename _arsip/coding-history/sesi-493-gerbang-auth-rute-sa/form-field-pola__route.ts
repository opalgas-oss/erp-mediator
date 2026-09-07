// app/api/form-field-pola/route.ts
// GET  — seluruh JENIS pola isian, termasuk yang sedang dimatikan (untuk layar SA).
// POST — SuperAdmin menambah JENIS pola baru.
//
// Dibuat: Sesi #492 — K-488-T1b. Inilah yang membuat uji ATURAN 8.2 butir 7 terjawab IYA:
//   penerbit mengeluarkan format baru bulan depan ⇒ SA menambahkannya sendiri dari layar,
//   tanpa programmer, tanpa migrasi, dan tanpa data lama menjadi tidak sah.
//
// ⚠️ BUTUH SUPERADMIN. Katalog ini menentukan sah-tidaknya isian pendaftar; formulir publik
//   TIDAK memanggil rute ini — ia menerima katalognya dari server lewat `getSusunanFormulirVendor()`.

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import { getKatalogPolaUntukAdmin }  from '@/lib/services/form-field-pola.service'
import { FormFieldPolaRepo_buat }    from '@/lib/repositories/form-field-pola.repository'
import { saringPola }                from '@/lib/utils/form-field-pola-patch.util'

export async function GET() {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const data = await getKatalogPolaUntukAdmin()
    return NextResponse.json({ success: true, data })
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal membaca katalog pola'
    return NextResponse.json({ success: false, message: pesan }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin()
    if (!auth.ok) return auth.res

    const hasil = saringPola(await request.json(), true)
    if (!hasil.ok) {
      return NextResponse.json({ success: false, message: hasil.pesan }, { status: 400 })
    }

    const id = await FormFieldPolaRepo_buat(hasil.isi, auth.uid)
    return NextResponse.json({ success: true, id })
  } catch (err) {
    const pesan = err instanceof Error ? err.message : 'Gagal menyimpan jenis pola'
    // Kunci ganda = kesalahan SA yang bisa diperbaiki sendiri, bukan galat server.
    const status = pesan.includes('uq_form_field_pola_key') ? 400 : 500
    const teks = status === 400 ? 'Kunci pola itu sudah dipakai. Pilih kunci lain.' : pesan
    return NextResponse.json({ success: false, message: teks }, { status })
  }
}
