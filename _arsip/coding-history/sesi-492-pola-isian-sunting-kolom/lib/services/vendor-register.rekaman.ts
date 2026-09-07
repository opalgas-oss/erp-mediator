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
