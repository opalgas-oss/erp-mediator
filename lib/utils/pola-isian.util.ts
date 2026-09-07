// lib/utils/pola-isian.util.ts
// Menguji satu isian terhadap POLA BERLAPIS yang berlaku pada tanggal pengisian.
// Dibuat: Sesi #492 — K-488-T2 + K-488-T3.
//
// 🔴 SATU SUMBER, DUA PEMAKAI — sama seperti `validasi-form-field.util.ts`.
//   ⛔ Berkas ini TIDAK boleh 'server-only' dan TIDAK boleh menyentuh Supabase:
//   katalog polanya DIOPER MASUK sebagai data, supaya layar dan server memakai
//   perhitungan yang sama persis dan tidak mungkin berbeda pendapat.
//
// 🔴 K-488-T3 — SAH BILA COCOK SALAH SATU POLA YANG BERLAKU PADA TANGGAL PENGISIAN.
//   ⇒ menambah pola baru TIDAK membuat isian lama menjadi tidak sah (ATURAN 8.2 butir 4).
//   Contoh hidup: NPWP 16 digit (PMK 81/2024) dan 15 digit (PMK 112/2022) sama-sama beredar.

import type { FormFieldPolaPublik, PolaTerpakai } from '@/lib/types/form-field-pola.types'

/** Tanggal (YYYY-MM-DD) hari ini menurut jam mesin pemanggil. */
export function tanggalHariIni(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Apakah satu pola berlaku pada `tanggal`.
 * `berlaku_sampai` kosong = masih berlaku. `berlaku_sejak` kosong = sudah berlaku sejak kapan pun.
 */
export function polaBerlaku(pola: PolaTerpakai, tanggal: string): boolean {
  const sejak  = typeof pola.berlaku_sejak  === 'string' ? pola.berlaku_sejak  : null
  const sampai = typeof pola.berlaku_sampai === 'string' ? pola.berlaku_sampai : null
  if (sejak  && tanggal < sejak)  return false
  if (sampai && tanggal > sampai) return false
  return true
}

/**
 * Isi tempat-kosong `%nama_parameter%` pada ekspresi katalog dengan nilai yang
 * SA isikan di kolom formulir.
 *
 * 🔴 PEMBATASNYA `%…%`, ⛔ BUKAN kurung kurawal — dan sebabnya diukur, bukan dipilih:
 *   versi pertama memakai `{panjang}` sehingga `^[0-9]{panjang}$` berubah menjadi
 *   `^[0-9]16$` — kurung kurawalnya IKUT termakan, dan pengulangan regex-nya hilang.
 *   Uji sendiri di S#492 menjatuhkannya (NPWP 16 digit gagal). Dengan `%…%`,
 *   `^[0-9]{%panjang%}$` menjadi `^[0-9]{16}$`, dan `%ekspresi%` pada pola lanjutan
 *   tetap tergantikan seluruhnya.
 *
 * Parameter yang tidak terisi dibiarkan apa adanya — ekspresi yang masih memuat `%`
 * akan gagal dikompilasi, dan itu ditangani pemanggil sebagai kesalahan DATA,
 * ⛔ bukan kesalahan pendaftar.
 */
export function bangunEkspresi(ekspresi: string, dipakai: PolaTerpakai): string {
  return ekspresi.replace(/%([a-z][a-z0-9_]*)%/gi, (utuh, nama: string) => {
    const nilai = dipakai[nama]
    if (nilai === undefined || nilai === null || nilai === '') return utuh
    return String(nilai)
  })
}

/** Satu pola dari katalog berdasarkan `pola_key`, atau `null` kalau tidak dikenal. */
function cariKatalog(katalog: FormFieldPolaPublik[], nama: string): FormFieldPolaPublik | null {
  for (const k of katalog) if (k.pola_key === nama) return k
  return null
}

/**
 * Uji `teks` terhadap daftar pola yang dipakai satu kolom.
 * Memulangkan `true` bila SAH.
 *
 * Tiga keadaan sengaja memulangkan SAH, dan sebabnya sama: kesalahan DATA tidak boleh
 * menghukum pendaftar (pola S#426 — perubahan yang mematahkan penulis yang hidup):
 *   1. nol pola yang berlaku pada tanggal itu ⇒ nol pembatasan bentuk;
 *   2. `nama` pola tidak ada di katalog (mis. jenisnya dimatikan SA sesudah kolom disetel);
 *   3. ekspresinya tidak bisa dikompilasi.
 */
export function ujiPolaIsian(
  teks:    string,
  dipakai: PolaTerpakai[],
  katalog: FormFieldPolaPublik[],
  tanggal: string = tanggalHariIni(),
): boolean {
  const berlaku = dipakai.filter((p) => polaBerlaku(p, tanggal))
  if (berlaku.length === 0) return true

  let adaYangBisaDiuji = false

  for (const p of berlaku) {
    const jenis = cariKatalog(katalog, p.nama)
    if (!jenis) continue
    let cocok = false
    try {
      cocok = new RegExp(bangunEkspresi(jenis.ekspresi, p)).test(teks)
    } catch {
      continue
    }
    adaYangBisaDiuji = true
    if (cocok) return true
  }

  return !adaYangBisaDiuji
}
