// lib/utils/tampilan-nilai.util.ts
// Penegak kunci `validasi.tampilan` — satu-satunya tempat yang tahu BAGAIMANA nilai disamarkan.
// Dibuat: Sesi #493 — K-492-T8 (penegaknya dibuat LEBIH DULU, sebelum dialog menawarkan medannya).
// Menutup separuh hutang #128: `tampilan` tersimpan di `nik` sejak S#486 dengan NOL penegak.
//
// 🔴 MURNI TAMPILAN. Nilai yang tersimpan di state DAN yang dikirim ke server tetap nilai ASLI.
//   Kalau nilainya ikut tersamar, `nik` yang berpola `^[0-9]{16}$` akan gagal — atau lebih buruk,
//   lolos dengan nilai yang salah. Penyamaran adalah urusan mata, bukan urusan data.
//
// ⛔ BUKAN `type="password"`, dan sebabnya diukur bukan dirasa: halaman `/register` SUDAH memuat
//   dua medan kata sandi sungguhan (`RegisterClient.tsx`), dan medan ketiga bertipe sama membuat
//   pengelola sandi peramban menawarkan MENYIMPAN NIK — kebalikan dari tujuan "disamarkan".
//
// 🔴 SATU SUMBER, DUA PEMAKAI (pola yang sama dengan `pola-isian.util.ts`): berkas ini TIDAK
//   'server-only' dan TIDAK menyentuh Supabase, supaya penampil mana pun memakai perhitungan
//   yang sama persis.

/** Nilai sah kunci `validasi.tampilan`. Nilai lain diperlakukan sebagai `apa_adanya`. */
export type TampilanNilai = 'apa_adanya' | 'disamarkan'

const KARAKTER_SAMAR = '•'

/** Berapa karakter terakhir yang dibiarkan terlihat supaya pendaftar mengenali isiannya sendiri. */
const SISA_TERLIHAT_BAWAAN = 4

/**
 * Baca kunci `tampilan` dari objek `validasi`.
 * Nilai yang tidak dikenal ⇒ `apa_adanya`: kesalahan DATA tidak boleh menghukum pendaftar
 * (pola S#426, sama seperti `ujiPolaIsian`).
 */
export function bacaTampilan(validasi: Record<string, unknown> | null | undefined): TampilanNilai {
  if (!validasi || typeof validasi !== 'object') return 'apa_adanya'
  return (validasi as { tampilan?: unknown }).tampilan === 'disamarkan' ? 'disamarkan' : 'apa_adanya'
}

/**
 * Samarkan `teks` untuk DILIHAT, ⛔ bukan untuk disimpan.
 * Empat karakter terakhir dibiarkan; teks yang tidak lebih panjang dari itu disamarkan seluruhnya
 * — supaya isian pendek tidak justru terbaca utuh.
 */
export function samarkanNilai(teks: string, sisaTerlihat: number = SISA_TERLIHAT_BAWAAN): string {
  if (teks.length === 0) return ''
  if (teks.length <= sisaTerlihat) return KARAKTER_SAMAR.repeat(teks.length)
  return KARAKTER_SAMAR.repeat(teks.length - sisaTerlihat) + teks.slice(teks.length - sisaTerlihat)
}
