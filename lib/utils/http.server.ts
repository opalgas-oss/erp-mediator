// lib/utils/http.server.ts
// Utilitas klasifikasi HTTP error status untuk API route SuperAdmin
//
// Dibuat: Sesi #180 — SL-D009+K009
// Tujuan: Satu sumber kebenaran untuk keyword-based 400 vs 500 classification.
//         Sebelumnya tersebar di 13 route dengan keyword berbeda-beda → behavior tidak konsisten.
//
// Terdaftar di cr_functions: CONFIG/infrastructure, is_shared=true

import 'server-only'

/**
 * Keyword yang mengindikasikan error validasi (400).
 * Union dari semua keyword yang ditemukan di 13 route SA saat audit S#179.
 */
const VALIDATION_KEYWORDS_400: readonly string[] = [
  // Umum
  'wajib',
  'karakter',
  'format',
  'huruf',
  'harus',
  'antara',
  // Field spesifik
  'NPWP',
  'WA',
  'Slug',
  'Label',
  'Nama',
  'Sort',
  'Kategori',
  // Duplikasi / konflik
  'sudah digunakan',
  'sudah',
  'induk',
  'diawali',
  // Override / nilai
  'value',
  'override',
  'aktif',
  // Status / logika bisnis
  'Tidak bisa',
  'Alasan',
  'retroaktif',
  'komisi',
  'Hanya',
  // PIC cadangan
  'tidak memiliki PIC cadangan',
]

/**
 * Klasifikasikan HTTP error status dari pesan error.
 *
 * @param message - Error message dari catch block
 * @returns 400 jika pesan mengandung keyword validasi, 500 untuk error server lainnya
 *
 * @example
 * // Di catch block route:
 * const status = message.includes('tidak ditemukan') ? 404 : classifyHttpError(message)
 * return NextResponse.json({ success: false, message }, { status })
 */
export function classifyHttpError(message: string): 400 | 500 {
  return VALIDATION_KEYWORDS_400.some(k => message.includes(k)) ? 400 : 500
}
