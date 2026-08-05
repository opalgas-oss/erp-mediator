// lib/utils/ambil-json-klien.util.ts
// Pengambil JSON SISI-KLIEN yang tidak pernah melempar dan tidak pernah menggantung.
//
// Dibuat: Sesi #439 — dipakai bersama oleh dua pembaca sisi-klien halaman error.
//
// KENAPA BERKAS INI LAHIR (ATURAN 19 poin 6 — logic yang sama di >1 tempat = bug arsitektur):
//   `lib/maintenance-klien.ts` (S#438) sudah memuat fungsi privat `ambilJson` dengan isi PERSIS
//   seperti di bawah. S#439 membutuhkan perilaku yang sama untuk membaca nama halaman. Menyalinnya
//   ke berkas kedua akan melahirkan dua rumah untuk satu logika — jenis luka yang sama dengan
//   `TEMUAN-NORMALISASI-WA-EMPAT-RUMAH` (S#424). Jadi isinya DIANGKAT ke sini, dan
//   `maintenance-klien.ts` memakai berkas ini — bukan menyimpan salinannya sendiri.
//   ⚠️ Ini BUKAN refactor ke scope lebih luas (ATURAN 5): yang disentuh hanya duplikasi yang
//   PEKERJAAN INI SENDIRI akan lahirkan kalau dibiarkan.
//
//
// ATURAN 19 DITEGAKKAN SEBELUM BERKAS INI DIBUAT — dan padanannya MEMANG ADA, tetapi TIDAK BISA
// DIPAKAI, jadi alasannya ditulis di sini supaya sesi berikutnya tidak menuduh duplikasi:
//   `fetchWithTimeout` di `lib/utils/fetch.server.ts` melakukan hal yang mirip, TAPI ia ber-
//   `import 'server-only'`. Mengimpornya dari Client Component menariknya ke bundel klien dan
//   build GAGAL — kelas kesalahan yang sama dengan T-438-3. Perilakunya pun berbeda: ia MELEMPAR
//   saat gagal, sedangkan halaman error justru menuntut kebalikannya. Berkas ini adalah
//   KEMBARAN SISI-KLIEN-nya, bukan salinannya.
// KENAPA GAGAL SELALU JADI `null`, BUKAN LEMPARAN:
//   Pemanggilnya adalah halaman yang muncul saat sistem SEDANG rusak. Lemparan di sana berarti
//   penangkap error ikut jatuh dan pengguna kembali melihat layar mesin — persis yang §5.0.6
//   larang. Jaring terakhir tidak boleh punya tali ke sesuatu yang mungkin sudah putus.

/** Batas tunggu bawaan. Halaman error tidak boleh ikut menggantung saat Supabase lambat. */
export const BATAS_MS_KLIEN = 4000

/**
 * Ambil JSON dengan batas waktu. Gagal apa pun — jaringan, status bukan 2xx, kehabisan waktu,
 * badan respons bukan JSON — mengembalikan `null` dan TIDAK melempar.
 */
export async function ambilJsonKlien(
  url: string,
  batasMs: number = BATAS_MS_KLIEN
): Promise<Record<string, unknown> | null> {
  const pembatal = new AbortController()
  const jam = setTimeout(() => pembatal.abort(), batasMs)
  try {
    const res = await fetch(url, { cache: 'no-store', signal: pembatal.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(jam)
  }
}
