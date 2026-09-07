// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.urutan.ts
// Perhitungan URUTAN baris di dalam satu kartu. Dibuat: Sesi #492 — K-487-T3 + K-487-T4.
//
// 🔴 K-487-T3 — HIMPUNAN NILAI `urutan` MILIK SATU KARTU TETAP, HANYA DIBAGIKAN ULANG.
//   ⛔ Penomoran ulang global 10/20/30… DIBATALKAN, dan sebabnya diukur: menomori ulang seluruh
//   baris memindahkan kartu Risiko dan Tampilan tanpa diminta. Yang berlaku: nilai-nilai `urutan`
//   yang SUDAH dimiliki kartu itu diurutkan naik, lalu dibagikan ulang menurut posisi barunya.
//   ⇒ urutan antar-kartu tidak pernah bergeser, dan baris di kartu lain NOL tersentuh.
//
// 🔴 K-487-T4 — PERPINDAHAN HANYA DI DALAM SATU KARTU. Sebab langsungnya K-487-T3: kelompok
//   diturunkan dari `urutan`. Perpindahan ke luar kartu ditolak DIAM — nol galat, nol perubahan.
//
// Contoh hidup (kartu Legalitas, himpunan {60, 70, 80, 90, 200} — kelompok memang TIDAK kontigu):
//   `pernyataan_kompetensi` dinaikkan ke posisi 1 ⇒ pernyataan=60 · nib=70 · bukti=80 ·
//   sertifikat=90 · dokumen_lain=200. Himpunannya utuh, hanya pemiliknya bergeser.

import type { FormFieldRow } from '@/lib/types/form-field-registry.types'

/** Baris teratas tidak bisa naik. */
export function bisaNaik(indeks: number): boolean {
  return indeks > 0
}

/** Baris terbawah tidak bisa turun. */
export function bisaTurun(indeks: number, jumlah: number): boolean {
  return indeks < jumlah - 1
}

/**
 * Pindahkan satu baris di dalam SATU kartu, lalu bagikan ulang himpunan `urutan` kartu itu.
 * Indeks di luar jangkauan ⇒ daftar dipulangkan APA ADANYA (penolakan diam, K-487-T4).
 */
export function pindahkanBaris(
  fields: FormFieldRow[],
  dari:   number,
  ke:     number,
): FormFieldRow[] {
  if (dari === ke) return fields
  if (dari < 0 || ke < 0 || dari >= fields.length || ke >= fields.length) return fields

  const nilaiUrutan = fields.map((f) => f.urutan).sort((a, b) => a - b)

  const susunan = [...fields]
  const [dipindah] = susunan.splice(dari, 1)
  susunan.splice(ke, 0, dipindah)

  return susunan.map((f, i) => (f.urutan === nilaiUrutan[i] ? f : { ...f, urutan: nilaiUrutan[i] }))
}

/** Naikkan satu posisi. Baris teratas: daftar dipulangkan apa adanya. */
export function naikkan(fields: FormFieldRow[], indeks: number): FormFieldRow[] {
  return bisaNaik(indeks) ? pindahkanBaris(fields, indeks, indeks - 1) : fields
}

/** Turunkan satu posisi. Baris terbawah: daftar dipulangkan apa adanya. */
export function turunkan(fields: FormFieldRow[], indeks: number): FormFieldRow[] {
  return bisaTurun(indeks, fields.length) ? pindahkanBaris(fields, indeks, indeks + 1) : fields
}
