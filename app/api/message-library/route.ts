// app/api/message-library/route.ts
// GET — Ambil pesan dari message_library berdasarkan kategori.
//
// Endpoint ini PUBLIC — tidak membutuhkan auth.
// Alasan: login/page.tsx perlu fetch pesan sebelum user berhasil login.
//
// Query params:
//   ?kategori=login_ui               → satu kategori
//   ?kategori=login_ui,otp_ui        → beberapa kategori (pisah koma)
//
// Response:
//   { success: true,  data: { "login_error_credentials_salah": "Email atau password..." } }
//   { success: false, message: "..." }

import { NextRequest, NextResponse }     from 'next/server'
import { getMessagesByKategori }         from '@/lib/message-library'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const kategoriParam = searchParams.get('kategori') ?? ''

    if (!kategoriParam.trim()) {
      return NextResponse.json(
        { success: false, message: 'Parameter kategori wajib diisi' },
        { status: 400 }
      )
    }

    // Support beberapa kategori dipisah koma: ?kategori=login_ui,otp_ui
    const kategoriList = kategoriParam
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)

    const data = await getMessagesByKategori(kategoriList)

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('[GET /api/message-library] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    )
  }
}
