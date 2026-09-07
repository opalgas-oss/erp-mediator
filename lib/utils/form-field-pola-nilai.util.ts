// lib/utils/form-field-pola-nilai.util.ts
// Penguji NILAI satu per satu untuk katalog jenis pola isian.
// Lahir: Sesi #492, dari pemecahan `form-field-pola-patch.util.ts`.
//
// 🔴 DIPECAH SEBELUM BERKAS PERTAMA MENDARAT (ATURAN 54.3): gabungannya terukur 6.274 B = 61,3%
//   plafon kode 10.240 B, sedangkan berkas yang LAHIR wajib maksimal 50% (5.120 B).
//   Diukur, bukan ditaksir.
// Sumbu = ALASAN BERUBAH: menguji NILAI di sini · menyusun MUATAN di berkas saudaranya.

export const POLA_KEY_POLA = /^[a-z][a-z0-9_]*$/
export const LABEL_MAKS = 120
export const PESAN_MAKS = 200

export function tanggalSah(n: unknown): boolean {
  return typeof n === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(n) && !Number.isNaN(Date.parse(n))
}

export function teksIsi(n: unknown, maks: number): boolean {
  return typeof n === 'string' && n.trim().length > 0 && n.trim().length <= maks
}

/**
 * Ekspresi wajib bisa DIKOMPILASI sesudah tempat-kosongnya diisi contoh.
 * ⛔ Tanpa penjagaan ini, SA bisa menyimpan pola rusak yang diam-diam meloloskan semua isian
 *   (penguji memperlakukan ekspresi rusak sebagai "tidak menghukum pendaftar").
 */
export function ekspresiBisaDikompilasi(ekspresi: string): boolean {
  try {
    new RegExp(ekspresi.replace(/%([a-z][a-z0-9_]*)%/gi, '1'))
    return true
  } catch {
    return false
  }
}

export function periksaParameterSkema(nilai: unknown): string | null {
  if (nilai === undefined) return null
  if (nilai === null || typeof nilai !== 'object' || Array.isArray(nilai)) {
    return '"parameter_skema" harus objek'
  }
  for (const [nama, isi] of Object.entries(nilai as Record<string, unknown>)) {
    if (!POLA_KEY_POLA.test(nama)) return `Nama parameter "${nama}" harus huruf kecil, angka, garis bawah`
    if (isi === null || typeof isi !== 'object' || Array.isArray(isi)) {
      return `Parameter "${nama}" harus objek`
    }
    const p = isi as Record<string, unknown>
    if (p.jenis !== 'bilangan' && p.jenis !== 'teks') {
      return `"jenis" parameter "${nama}" harus bilangan atau teks`
    }
    if (typeof p.wajib !== 'boolean') return `"wajib" parameter "${nama}" harus boolean`
    if (!teksIsi(p.label, LABEL_MAKS)) return `"label" parameter "${nama}" wajib diisi`
  }
  return null
}
