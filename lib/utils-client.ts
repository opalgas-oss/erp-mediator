'use client'

// lib/utils-client.ts
// Utility functions untuk Client Components — tidak boleh dipakai di Server Components.
// Dibuat: Sesi #079 — DRY refactor (BLOK B)
// Alasan: getCookie dan interpolate ditulis duplikat di 3+ file berbeda.
//
// Fungsi yang diekspor:
//   getCookie   — baca cookie browser by name
//   interpolate — ganti placeholder {key} dalam string dengan nilai dari vars

/**
 * Membaca nilai cookie browser berdasarkan nama.
 * Aman dipanggil saat SSR (return '' jika document tidak tersedia).
 *
 * @param name - Nama cookie yang dicari
 * @returns Nilai cookie yang sudah di-decode, atau '' jika tidak ditemukan
 */
export function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

/**
 * Mengganti placeholder {key} dalam string dengan nilai dari objek vars.
 * Placeholder yang tidak ada nilainya dikembalikan apa adanya: {key}.
 *
 * @param teks - String template dengan placeholder {key}
 * @param vars - Objek key-value untuk mengganti placeholder
 * @returns String hasil interpolasi
 *
 * @example
 * interpolate('Login {waktu}', { waktu: '08:30' }) // → 'Login 08:30'
 */
export function interpolate(teks: string, vars: Record<string, string>): string {
  return teks.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
}

/**
 * Format ISO timestamp → tanggal singkat bahasa Indonesia.
 * Contoh: '2026-05-04T16:36:54Z' → '04 Mei 2026'
 *
 * Dipakai oleh: MessageLibraryClient (kolom Diupdate), dan komponen lain yang
 * butuh tampilan tanggal singkat id-ID.
 *
 * DIBUAT: Sesi #101 — DRY fix. Menggantikan fmtDate() lokal di MessageLibraryClient.
 *
 * @param iso - ISO timestamp string
 * @returns Tanggal terformat: '04 Mei 2026'
 */
export function formatDateIdShort(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/**
 * Normalisasi nomor WhatsApp Indonesia ke format 62xxx.
 * - '08xxxxxxxxx'  → '628xxxxxxxxx'
 * - '8xxxxxxxxx'   → '628xxxxxxxxx'
 * - selain itu     → hanya digit yang dipertahankan
 *
 * Dipakai oleh: DialogTambahPICCadangan (S#147). Catatan: DialogTambahTenant
 * masih punya salinan lokal — perlu dikonsolidasikan ke fungsi ini (hutang teknis).
 *
 * @param s - Input nomor WA mentah (boleh mengandung spasi/tanda)
 * @returns Nomor WA ter-normalisasi (hanya digit, prefix 62)
 */
export function autoCorrectWA(s: string): string {
  const digits = s.replace(/\D/g, '')
  if (digits.startsWith('08')) return '62' + digits.slice(1)
  if (digits.startsWith('8') && !digits.startsWith('62')) return '62' + digits
  return digits
}
