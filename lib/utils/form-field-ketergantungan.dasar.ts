// lib/utils/form-field-ketergantungan.dasar.ts
// Kosakata bersama seluruh aturan: tipe kolom yang punya perlakuan khusus, dan arti "HIDUP".
// Dipecah dari `form-field-ketergantungan.util.ts` — S#497. Sebab pemecahan ada di induk itu.
// ⛔ MURNI — nol Supabase, nol `server-only`.

import type { BarisKetergantungan } from '@/lib/types/form-field-ketergantungan.types'

/**
 * Tipe kolom yang isinya bisa dibandingkan huruf per huruf.
 * 🔴 RUMAH TUNGGALNYA DI SINI (ATURAN 36) — dialog Sunting mengimpornya, ⛔ tidak menyalinnya.
 * Gambar dan berkas tidak bisa dibandingkan; itulah cacat yang melahirkan hutang #128.
 */
export const TIPE_BISA_DIBANDINGKAN = ['text', 'textarea']

/**
 * Tipe kolom yang isinya DIAMBIL dari katalog, bukan diketik pendaftar.
 * 🔴 Kolom bertipe ini TANPA sumber opsi tidak akan pernah muncul di formulir — ia dibuang
 * `saringKolomYangBisaDirender` secara SENYAP. Itulah cacat yang R3 di bawah tangkap.
 */
export const TIPE_BUTUH_SUMBER_OPSI = ['select', 'multiselect']

/**
 * Tipe kolom yang isinya BERKAS yang diunggah, bukan diketik.
 * 🔴 Ia yang menentukan cakupan R4, dan nama kunci Config-nya sendiri menyebutnya:
 * `layar_verifikasi_BERKAS_aktif`. Kolom teks ber-`butuh_verifikasi_admin` (mis. `nib`)
 * ⛔ BUKAN urusan R4 — hutangnya #138, dan R4 tidak diam-diam mengubahnya jadi kunci panel.
 */
export const TIPE_BERKAS = ['file', 'image']

/** Kolom dianggap HIDUP di formulir hanya kalau kedua saklarnya menyala. */
export function hidup(b: BarisKetergantungan): boolean {
  return b.is_visible && b.is_active
}
