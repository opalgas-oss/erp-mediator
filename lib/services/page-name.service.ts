// lib/services/page-name.service.ts
// Service resolver ALAMAT HALAMAN → NAMA HALAMAN yang enak dibaca.
// Dibuat: Sesi #439 — bagian B halaman error, §B1 langkah 2-5 (K-417-2).
//
// Layer Service (3-layer: Route -> Service -> Repository).
// Repository hanya query; pemilihan padanan terbaik + terjemahan label ke teks ada di sini.
//
// KENAPA BERKAS SENDIRI, BUKAN MENUMPANG `dashboard-menu.service.ts`:
//   Berkas itu diukur dari disk S#439 = 8.146 B = 79,6% batas 10.240 B. Ambang tindakan 80%
//   (K-429-1) akan TERLEWAT oleh baris pertama yang ditambahkan ke sana. Sumbu pemisahannya juga
//   benar menurut ALASAN BERUBAH (ATURAN 50.5): berkas itu berubah kalau hierarki sidebar berubah,
//   berkas ini berubah kalau cara menamai halaman yang RUSAK berubah. Dua alasan = dua rumah.
//
// ANTI-HARDCODE (ATURAN 8 + ATURAN 49): NOL daftar nama halaman di dalam kode. Seluruh nama
//   datang dari `dashboard_menus` + `message_library` — katalog yang sudah data-driven.
//   ⛔ `resolvePageMeta` di `lib/constants/page-meta.constant.ts` SENGAJA TIDAK DIPAKAI ULANG dan
//   TIDAK diperluas: isinya 16 alamat yang di-HARDCODE, persis yang §B1 ada untuk menggantikan.

import 'server-only'
import { DashboardMenuRepo_getByRoutePaths } from '@/lib/repositories/dashboard-menu.repository'
import { getMessage } from '@/lib/message-library'

/** Hasil resolusi. `menuKey` null bila alamatnya tidak punya padanan di katalog menu. */
export interface HasilNamaHalaman {
  menuKey:     string | null
  namaHalaman: string
}

/** Batas ruas alamat yang ditelusuri mundur — penjaga agar alamat aneh tidak melahirkan query raksasa. */
const MAKS_KANDIDAT = 8

/**
 * Susun daftar kandidat alamat: alamat utuh lebih dulu, lalu potong satu ruas terakhir berulang.
 * Menjalankan §B1 langkah 2 + langkah 4 sekaligus — menangani sub-halaman seperti `/tenants/[id]`.
 * Contoh: `/dashboard/superadmin/tenants/abc` -> [`/dashboard/superadmin/tenants/abc`,
 *          `/dashboard/superadmin/tenants`, `/dashboard/superadmin`, `/dashboard`]
 */
export function susunKandidatAlamat(routePath: string): string[] {
  const bersih = routePath.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  if (bersih === '/') return ['/']

  const kandidat: string[] = []
  let jalan = bersih
  while (jalan.length > 1 && kandidat.length < MAKS_KANDIDAT) {
    kandidat.push(jalan)
    jalan = jalan.slice(0, jalan.lastIndexOf('/')) || '/'
  }
  return kandidat
}

/**
 * §B1 langkah 1-5, dijalankan di server.
 *
 * 1. Alamat diterima dari pemanggil (klien membacanya sendiri lewat `usePathname()` /
 *    `window.location.pathname` — berkas ini tidak pernah menebak alamat).
 * 2. Cocokkan ke `dashboard_menus.route_path` (baris hidup, `is_active` + `deleted_at IS NULL`).
 * 3. Ketemu -> ambil `label_key` -> teks tampilan dari `message_library`.
 * 4. Tidak ketemu -> potong satu ruas terakhir, ulangi (sudah dirakit di `susunKandidatAlamat`).
 * 5. Tetap tidak ketemu -> pakai alamat mentah sebagai nama halaman.
 *
 * ⚠️ LANGKAH 3 GAGAL KE LANGKAH 5, BUKAN KE NAMA KEY. Keputusan teknis Claude, disodorkan terbuka
 * (ATURAN 13), dan dasarnya data yang diukur S#439 dari Supabase — bukan selera:
 *   `super_admin` 18 dari 18 `label_key` punya baris `message_library`; `admin_tenant` 29 dari 29
 *   TIDAK punya. Kalau `getMessage()` dibiarkan mengembalikan nama key-nya seperti perilaku
 *   bawaannya, SETIAP halaman AT yang rusak akan memajang `nav_at_keuangan_refund_koreksi` ke
 *   wajah pengguna. Di layar yang justru ada untuk MENGGANTIKAN bahasa mesin, nama key adalah
 *   bahasa mesin yang lain. Alamat mentah lebih jujur dan lebih bisa dibaca manusia.
 *   ⇒ Kekosongan 29 baris itu DICATAT sebagai temuan, TIDAK ditambal di sini (ATURAN 7).
 */
export async function PageNameService_findByRoutePath(
  routePath: string
): Promise<HasilNamaHalaman> {
  const kandidat = susunKandidatAlamat(routePath)
  const alamatMentah = kandidat[0] ?? routePath

  const baris = await DashboardMenuRepo_getByRoutePaths(kandidat)

  if (baris.length === 0) return { menuKey: null, namaHalaman: alamatMentah }

  // Padanan TERPANJANG menang — urutan `kandidat` sudah dari yang paling spesifik ke yang paling
  // umum, jadi yang pertama ketemu di daftar itulah yang paling dekat dengan halaman sebenarnya.
  const petaBaris = new Map(baris.map(b => [b.route_path ?? '', b]))
  const cocok = kandidat.map(k => petaBaris.get(k)).find(Boolean)

  if (!cocok) return { menuKey: null, namaHalaman: alamatMentah }

  // Fallback '' SENGAJA: `getMessage(key)` tanpa fallback mengembalikan nama key-nya sendiri.
  // Di sini yang dibutuhkan justru pembeda "ada teksnya" vs "tidak ada barisnya".
  const teks = await getMessage(cocok.label_key, '')

  return {
    menuKey:     cocok.menu_key,
    namaHalaman: teks.trim() || alamatMentah,
  }
}
