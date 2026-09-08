// app/api/auth/vendor-register/route.ts
// POST — pendaftaran vendor dari halaman publik /register. Dibuat: Sesi #486.
//
// ⚠️ RUTE PUBLIK — sengaja NOL guard sesi: pendaftar memang belum punya akun.
//   Ditaruh di bawah /api/auth/ karena jalur itu sudah dikecualikan dari gerbang tutup situs
//   di middleware.ts (dua tempat), jadi pendaftaran tidak ikut tertutup saat situs ditutup.
// ⛔ Seluruh penulisan terjadi di server dengan klien service_role; klien browser (anon)
//   tidak pernah menulis ke tabel mana pun.
//
// Pelindung penyalahgunaan Tahap 1: kolom umpan (honeypot) + email unik.
// ⚠️ Ambang laju per IP BELUM dipasang — dicatat sebagai hutang, bukan didiamkan.

import { NextRequest, NextResponse } from 'next/server'
import { daftarVendor } from '@/lib/services/vendor-register.service'
import type { VendorRegisterPayload } from '@/lib/types/vendor-register.types'

interface GalatBerkolom { galatKolom?: Record<string, string> }

function tidakLengkap(p: VendorRegisterPayload): string | null {
  if (!p.akun) return 'Data akun wajib diisi'
  const { nama, email, nomor_wa, password } = p.akun
  if (!nama?.trim())           return 'Nama lengkap wajib diisi'
  if (!email?.trim())          return 'Email wajib diisi'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Format email tidak valid. Contoh: nama@email.com'
  if (!nomor_wa?.trim())       return 'Nomor WhatsApp wajib diisi'
  if (!password || password.length < 8) return 'Password minimal 8 karakter'
  if (!Array.isArray(p.jawaban))        return 'Isian formulir tidak terbaca'
  if (!p.persetujuan)                   return 'Ketiga pernyataan persetujuan wajib dicentang'
  return null
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as VendorRegisterPayload

    // Kolom umpan: hanya robot yang mengisinya. Dijawab 200 supaya tidak memberi petunjuk.
    if (payload?.situs_web && payload.situs_web.trim().length > 0) {
      return NextResponse.json({ success: true, data: { submission_id: '', status: 'pending' } })
    }

    const kurang = tidakLengkap(payload)
    if (kurang) return NextResponse.json({ success: false, message: kurang }, { status: 400 })

    const hasil = await daftarVendor(payload)
    return NextResponse.json({ success: true, data: hasil })
  } catch (err) {
    const pesan  = err instanceof Error ? err.message : 'Gagal mendaftar. Coba lagi atau hubungi admin.'
    const kolom  = (err as GalatBerkolom)?.galatKolom
    const status = kolom || pesan.includes('wajib') || pesan.includes('sudah terdaftar') ? 400 : 500
    return NextResponse.json({ success: false, message: pesan, galatKolom: kolom }, { status })
  }
}
