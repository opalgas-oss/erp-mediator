// app/api/page-names/route.ts
// GET — terjemahkan SATU alamat halaman menjadi nama halaman yang enak dibaca.
//
// Query param: ?path=/dashboard/superadmin/messages   (wajib)
// Response:    { success: true, data: { menuKey: string | null, namaHalaman: string } }
//
// Dibuat: Sesi #439 — bagian B halaman error, §B1 langkah 1-5 (K-417-2).
//
// KENAPA ROUTE INI HARUS LAHIR (bukti, bukan selera — izin Philips S#439):
//   §B1 menuntut alamat halaman dicocokkan ke `dashboard_menus.route_path` lalu `label_key`-nya
//   diterjemahkan lewat `message_library`. Satu-satunya endpoint menu yang sudah ada,
//   `GET /api/superadmin/dashboard-menus`, TIDAK bisa dipakai karena dua sebab yang dibaca
//   langsung dari kodenya S#439:
//     1. Ia dipagari `requireSuperAdmin()` (baris 23) — halaman error justru wajib bekerja untuk
//        pengunjung publik, AdminTenant, dan Vendor.
//     2. `select`-nya `id, menu_key, parent_id, is_pj_only` — `route_path` dan `label_key`, dua
//        kolom yang justru dibutuhkan §B1, tidak ikut terbawa.
//   ATURAN 19 ditegakkan lebih dulu: `cr_functions` NOL padanan resolver rute→nama halaman.
//
// ENDPOINT INI SENGAJA PUBLIK (tanpa auth) — alasan yang sama persis dengan
// `POST /api/error-report`: halaman error muncul justru saat sistem sedang tidak sehat, termasuk
// saat sesi login yang rusak. Mewajibkan sesi di sini berarti nama halaman tidak akan pernah
// tampil di layar yang paling membutuhkannya.
//
// ⛔ KATALOG MENU TIDAK PERNAH DIBUKA KE PUBLIK. Kontraknya sengaja SATU ALAMAT MASUK, SATU NAMA
// KELUAR — nol daftar, nol penelusuran, nol `id`, nol `is_pj_only`. Yang keluar dari sini adalah
// label yang memang sudah tampil di sidebar pengguna yang sah, bukan struktur kewenangan.
//
// AREA RAWAN — `catch {}` KOSONG (BUG-034 · BUG-038): setiap cabang gagal WAJIB berisik di log.
// Tetapi ke PEMANGGIL ia selalu menjawab 200 dengan alamat mentah: halaman error tidak boleh ikut
// gagal hanya karena nama halamannya tidak berhasil dicari (§5.0.6).

import { NextRequest, NextResponse } from 'next/server'
import { PageNameService_findByRoutePath } from '@/lib/services/page-name.service'

export const dynamic = 'force-dynamic'

/** Batas panjang alamat — sama dengan batas `routePath` di DTO `POST /api/error-report`. */
const MAKS_PANJANG_PATH = 500

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? ''

  if (!path.trim() || !path.startsWith('/') || path.length > MAKS_PANJANG_PATH) {
    console.warn('[GET /api/page-names] parameter path tidak sah')
    return NextResponse.json(
      { success: false, message: 'Parameter path wajib diisi dan harus diawali "/"' },
      { status: 400 }
    )
  }

  try {
    const data = await PageNameService_findByRoutePath(path)
    return NextResponse.json({ success: true, data })

  } catch (error) {
    // Berisik di log, ramah di layar. Kegagalan pencarian nama BUKAN alasan halaman error gagal.
    console.error('[GET /api/page-names] gagal mencari nama halaman:', error)
    return NextResponse.json({
      success: true,
      data: { menuKey: null, namaHalaman: path },
    })
  }
}
