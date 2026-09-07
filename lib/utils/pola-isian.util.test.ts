// lib/utils/pola-isian.util.test.ts
// Uji pola berlapis — K-488-T3. Dibuat: Sesi #492.
//
// Dijalankan `npm test` (vitest.config.ts include: lib/**/*.test.ts).
// ⚠️ TIDAK ikut `npm run prebuild` — `prebuild` sengaja hanya menjalankan `lib/guards`.
//
// Kasus hidup yang diuji: NPWP 16 digit (PMK 81/2024) dan 15 digit (PMK 112/2022)
// sama-sama beredar ⇒ keduanya WAJIB sah, dan menambah pola baru TIDAK boleh
// membuat isian lama menjadi tidak sah (ATURAN 8.2 butir 4).

import { describe, expect, it } from 'vitest'
import { bangunEkspresi, polaBerlaku, ujiPolaIsian } from './pola-isian.util'
import type { FormFieldPolaPublik, PolaTerpakai } from '@/lib/types/form-field-pola.types'

const KATALOG: FormFieldPolaPublik[] = [
  {
    pola_key:        'angka_panjang_tetap',
    label:           'Angka panjang tetap',
    jenis_ekspresi:  'regex',
    ekspresi:        '^[0-9]{%panjang%}$',
    parameter_skema: { panjang: { jenis: 'bilangan', wajib: true, label: 'Panjang' } },
    pesan_galat:     '{label} harus {panjang} digit angka',
  },
  {
    pola_key:        'hanya_angka',
    label:           'Hanya angka',
    jenis_ekspresi:  'regex',
    ekspresi:        '^[0-9]+$',
    parameter_skema: {},
    pesan_galat:     '{label} hanya boleh berisi angka',
  },
]

const NPWP: PolaTerpakai[] = [
  { nama: 'angka_panjang_tetap', panjang: 16, berlaku_sejak: '2025-01-01', berlaku_sampai: null, sumber: 'PMK 81/2024' },
  { nama: 'angka_panjang_tetap', panjang: 15, berlaku_sejak: '2022-09-08', berlaku_sampai: null, sumber: 'PMK 112/2022' },
]

describe('bangunEkspresi', () => {
  it('mengisi tempat-kosong dari parameter pola', () => {
    expect(bangunEkspresi('^[0-9]{%panjang%}$', NPWP[0])).toBe('^[0-9]{16}$')
  })
  it('membiarkan tempat-kosong yang parameternya tidak terisi', () => {
    expect(bangunEkspresi('^[0-9]{%panjang%}$', { nama: 'angka_panjang_tetap' })).toBe('^[0-9]{%panjang%}$')
  })
})

describe('polaBerlaku', () => {
  it('kosong pada berlaku_sampai berarti masih berlaku', () => {
    expect(polaBerlaku(NPWP[0], '2026-09-07')).toBe(true)
  })
  it('tanggal sebelum berlaku_sejak ditolak', () => {
    expect(polaBerlaku(NPWP[0], '2024-12-31')).toBe(false)
  })
  it('tanggal sesudah berlaku_sampai ditolak', () => {
    expect(polaBerlaku({ nama: 'x', berlaku_sejak: '2020-01-01', berlaku_sampai: '2024-12-31' }, '2025-01-01')).toBe(false)
  })
})

describe('ujiPolaIsian — sah bila cocok SALAH SATU pola yang berlaku', () => {
  it('NPWP 16 digit sah', () => {
    expect(ujiPolaIsian('1234567890123456', NPWP, KATALOG, '2026-09-07')).toBe(true)
  })
  it('NPWP 15 digit — bentuk LAMA — tetap sah', () => {
    expect(ujiPolaIsian('123456789012345', NPWP, KATALOG, '2026-09-07')).toBe(true)
  })
  it('14 digit ditolak', () => {
    expect(ujiPolaIsian('12345678901234', NPWP, KATALOG, '2026-09-07')).toBe(false)
  })
  it('huruf ditolak', () => {
    expect(ujiPolaIsian('12345678901234AB', NPWP, KATALOG, '2026-09-07')).toBe(false)
  })
  it('isian lama tidak jadi tidak sah saat pola BARU ditambahkan', () => {
    const sebelum = ujiPolaIsian('123456789012345', [NPWP[1]], KATALOG, '2026-09-07')
    const sesudah = ujiPolaIsian('123456789012345', NPWP, KATALOG, '2026-09-07')
    expect(sebelum).toBe(true)
    expect(sesudah).toBe(true)
  })
  it('nol pola yang berlaku pada tanggal itu = nol pembatasan', () => {
    expect(ujiPolaIsian('apa saja', NPWP, KATALOG, '2020-01-01')).toBe(true)
  })
  it('nama pola yang tidak ada di katalog TIDAK menghukum pendaftar', () => {
    expect(ujiPolaIsian('apa saja', [{ nama: 'pola_yang_dimatikan' }], KATALOG, '2026-09-07')).toBe(true)
  })
  it('ekspresi rusak TIDAK menghukum pendaftar', () => {
    const rusak: FormFieldPolaPublik[] = [{ ...KATALOG[1], pola_key: 'rusak', ekspresi: '^[0-9' }]
    expect(ujiPolaIsian('abc', [{ nama: 'rusak' }], rusak, '2026-09-07')).toBe(true)
  })
})
