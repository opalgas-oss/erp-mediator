// lib/utils/tampilan-nilai.util.test.ts
// Uji penegak `validasi.tampilan` — S#493, hutang #128.
//
// Dijalankan `npm test` (vitest.config.ts include: lib/**/*.test.ts).
// ⚠️ TIDAK ikut `npm run prebuild` — `prebuild` sengaja hanya menjalankan `lib/guards`.
//
// Yang dijaga uji ini: penyamaran adalah urusan MATA. Fungsi di bawah tidak boleh dipakai
// menyentuh nilai yang dikirim ke server — karena itu ia diuji sebagai fungsi murni,
// dan pemakaiannya di layar diuji terpisah lewat DOM.

import { describe, expect, it } from 'vitest'
import { bacaTampilan, samarkanNilai } from './tampilan-nilai.util'

describe('bacaTampilan', () => {
  it('membaca "disamarkan" apa adanya', () => {
    expect(bacaTampilan({ tampilan: 'disamarkan' })).toBe('disamarkan')
  })

  it('nilai yang tidak dikenal, kosong, atau null = apa_adanya (kesalahan DATA tidak menghukum)', () => {
    expect(bacaTampilan({ tampilan: 'sembunyi' })).toBe('apa_adanya')
    expect(bacaTampilan({ tampilan: 123 })).toBe('apa_adanya')
    expect(bacaTampilan({})).toBe('apa_adanya')
    expect(bacaTampilan(null)).toBe('apa_adanya')
    expect(bacaTampilan(undefined)).toBe('apa_adanya')
  })

  it('kolom yang memakai apa_adanya secara eksplisit tetap apa_adanya', () => {
    expect(bacaTampilan({ tampilan: 'apa_adanya' })).toBe('apa_adanya')
  })
})

describe('samarkanNilai', () => {
  it('NIK 16 digit: 12 karakter tersamar, 4 terakhir terlihat', () => {
    expect(samarkanNilai('3273010101900001')).toBe('••••••••••••0001')
  })

  it('panjang hasil samaran SAMA dengan panjang aslinya', () => {
    const asli = '3273010101900001'
    expect(samarkanNilai(asli)).toHaveLength(asli.length)
  })

  it('isian pendek disamarkan SELURUHNYA — supaya tidak justru terbaca utuh', () => {
    expect(samarkanNilai('123')).toBe('•••')
    expect(samarkanNilai('1234')).toBe('••••')
  })

  it('isian kosong tetap kosong — placeholder tidak boleh tertimpa titik', () => {
    expect(samarkanNilai('')).toBe('')
  })

  it('jumlah sisa terlihat bisa diatur pemanggil', () => {
    expect(samarkanNilai('3273010101900001', 0)).toBe('••••••••••••••••')
  })
})
