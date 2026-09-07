// lib/services/vendor-register.rekaman.ts
// Bentuk data yang DIREKAM dari satu pengajuan.
// Lahir: Sesi #492, dari pemecahan `lib/services/vendor-register.service.ts`
//   (8.564 B = 83,63% plafon kode 10.240 B, hutang #120). Commit tersendiri,
//   NOL perubahan perilaku. Isi DIPINDAH oleh program dari berkas asal —
//   nol karakter diketik ulang.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-492-pecah-vendor-register-service/
// ISI BERKAS INI: keBarisJawaban.

import 'server-only'
import type { BarisJawaban } from '@/lib/repositories/vendor-register.repository'
import type { FormFieldRow } from '@/lib/types/form-field-registry.types'
import type { FormFieldPolaPublik } from '@/lib/types/form-field-pola.types'
import type { NilaiJawaban } from '@/lib/types/vendor-register.types'

export function keBarisJawaban(kolom: FormFieldRow[], jawaban: Record<string, NilaiJawaban>): BarisJawaban[] {
  const baris: BarisJawaban[] = []
  for (const k of kolom) {
    const nilai = jawaban[k.field_key]
    if (nilai === undefined || nilai === null) continue
    if (Array.isArray(nilai)) {
      if (nilai.length === 0) continue
      baris.push({ field_key: k.field_key, nilai: null, nilai_json: nilai })
      continue
    }
    if (typeof nilai === 'boolean') {
      baris.push({ field_key: k.field_key, nilai: nilai ? 'true' : 'false', nilai_json: null })
      continue
    }
    const teks = String(nilai).trim()
    if (teks.length === 0) continue
    baris.push({ field_key: k.field_key, nilai: teks, nilai_json: null })
  }
  return baris
}

/**
 * Salinan aturan yang BENAR-BENAR berlaku saat pengajuan dikirim — KEPUTUSAN FINAL S#488.
 *
 * 🔴 LABEL VERSI SAJA TIDAK CUKUP, dan sebabnya bukan selera: `form_field_registry` NOL tabel
 *   riwayat, jadi label versi tidak bisa diurai kembali menjadi aturan. Yang menepati
 *   ATURAN 8.2 butir 4 (data lama tidak boleh jadi tidak sah ketika aturan bertambah)
 *   adalah SNAPSHOT.
 * ⛔ Definisi pola ikut disalin, bukan hanya namanya: baris katalog boleh berubah kelak, dan
 *   pengajuan lama tetap harus bisa dinilai dengan ekspresi yang berlaku saat itu.
 *   Hanya pola yang BENAR-BENAR dipakai kolom formulir ini yang ikut.
 */
export function buatSnapshotAturan(
  kolom:       FormFieldRow[],
  katalogPola: FormFieldPolaPublik[],
): Record<string, unknown> {
  const aturanKolom: Record<string, unknown> = {}
  const namaDipakai = new Set<string>()

  for (const k of kolom) {
    aturanKolom[k.field_key] = k.validasi
    const pola = (k.validasi as { pola?: unknown }).pola
    if (!Array.isArray(pola)) continue
    for (const butir of pola) {
      const nama = (butir as { nama?: unknown }).nama
      if (typeof nama === 'string') namaDipakai.add(nama)
    }
  }

  const pola: Record<string, unknown> = {}
  for (const jenis of katalogPola) {
    if (!namaDipakai.has(jenis.pola_key)) continue
    pola[jenis.pola_key] = {
      jenis_ekspresi: jenis.jenis_ekspresi,
      ekspresi:       jenis.ekspresi,
      pesan_galat:    jenis.pesan_galat,
    }
  }

  return { dibuat_pada: new Date().toISOString(), kolom: aturanKolom, pola }
}
