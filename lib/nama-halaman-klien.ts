// lib/nama-halaman-klien.ts
// Pembaca SISI-KLIEN nama halaman yang enak dibaca, untuk halaman error.
// Kembarannya di server: `lib/services/page-name.service.ts`.
//
// Dibuat: Sesi #439 — bagian B halaman error, §B1 (K-417-2).
//
// KENAPA BERKAS INI ADA (batas Next.js, bukan selera — sama persis dengan `maintenance-klien.ts`):
//   `error.tsx` WAJIB Client Component, sedangkan pencarian nama halaman butuh Supabase lewat
//   berkas ber-`server-only`. Jadi klien tidak bisa memanggil servicenya langsung; ia bertanya
//   lewat `GET /api/page-names` yang menjalankan §B1 langkah 2-5 di server.
//
// KENAPA BUKAN DITITIPKAN KE `lib/maintenance-klien.ts`:
//   ALASAN BERUBAH-nya berbeda (ATURAN 50.5). Berkas itu berubah kalau kontrak config/teks
//   berubah; berkas ini berubah kalau kontrak katalog menu berubah. Berkas itu juga sudah
//   7.145 B = 69,8% batas 10.240 B — menumpang di sana mendorongnya ke ambang tindakan 80%.

import { ambilJsonKlien } from '@/lib/utils/ambil-json-klien.util'

export interface NamaHalamanKlien {
  menuKey:     string | null
  namaHalaman: string
}

/**
 * Tanyakan nama halaman untuk satu alamat.
 *
 * ⛔ TIDAK PERNAH MELEMPAR, TIDAK PERNAH MENGEMBALIKAN KOSONG. Gagal apa pun — jaringan mati,
 * route tak terjangkau, respons tidak dikenali — jatuh ke ALAMAT MENTAH (§B1 langkah 5), bukan ke
 * teks karangan dan bukan ke layar kosong. Halaman error tidak boleh ikut rusak oleh kerusakan
 * yang sedang ia tutupi (§5.0.6).
 */
export async function bacaNamaHalamanKlien(routePath: string): Promise<NamaHalamanKlien> {
  const cadangan: NamaHalamanKlien = { menuKey: null, namaHalaman: routePath }

  const json = await ambilJsonKlien(`/api/page-names?path=${encodeURIComponent(routePath)}`)
  const data = json?.data as Partial<NamaHalamanKlien> | undefined

  if (!data || typeof data.namaHalaman !== 'string' || !data.namaHalaman.trim()) return cadangan

  return {
    menuKey:     typeof data.menuKey === 'string' ? data.menuKey : null,
    namaHalaman: data.namaHalaman,
  }
}
