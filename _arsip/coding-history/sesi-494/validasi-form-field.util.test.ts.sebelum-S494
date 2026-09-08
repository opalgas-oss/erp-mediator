// lib/utils/validasi-form-field.util.test.ts
// Uji penegak `harus_sama_dengan` — S#493, hutang #128.
//
// Dijalankan `npm test` (vitest.config.ts include: lib/**/*.test.ts).
// ⚠️ TIDAK ikut `npm run prebuild` — `prebuild` sengaja hanya menjalankan `lib/guards`.
//
// 🔴 KASUS HIDUP YANG PALING PENTING ADA DI BAWAH: baris `nama_pemilik_rekening` di Supabase
//   hari ini memuat `harus_sama_dengan: "ktp"`, sedangkan `ktp` bertipe `image` dan TIDAK PERNAH
//   dirender di Tahap 1. Menegakkannya apa adanya membuat SELURUH `/register` buntu.
//   Uji "kolom rujukan tidak dirender ⇒ DILEWATI" adalah yang menahan kejadian itu.

import { describe, expect, it } from 'vitest'
import { validasiSemuaKolom } from './validasi-form-field.util'
import type { FormFieldPublik } from '@/lib/types/form-field-registry.types'

function kolom(sebagian: Partial<FormFieldPublik> & { field_key: string }): FormFieldPublik {
  return {
    group_key:   'Pembayaran',
    label:       sebagian.field_key,
    deskripsi:   null,
    placeholder: null,
    tipe_input:  'text',
    is_required: false,
    validasi:    {},
    ...sebagian,
  }
}

const NAMA_PEMILIK = kolom({
  field_key:  'nama_pemilik_rekening',
  label:      'Nama Pemilik Rekening',
  validasi:   { max_len: 100, harus_sama_dengan: 'nama_ktp' },
  is_required: true,
})
const NAMA_KTP = kolom({ field_key: 'nama_ktp', label: 'Nama Sesuai KTP', is_required: true })

describe('validasiSemuaKolom — harus_sama_dengan', () => {
  it('dua isian yang sama persis LOLOS', () => {
    const galat = validasiSemuaKolom([NAMA_PEMILIK, NAMA_KTP], {
      nama_pemilik_rekening: 'Budi Santoso',
      nama_ktp:              'Budi Santoso',
    })
    expect(galat).toEqual({})
  })

  it('beda besar-kecil huruf dan spasi ganda tetap LOLOS — dua sisi diketik manusia', () => {
    const galat = validasiSemuaKolom([NAMA_PEMILIK, NAMA_KTP], {
      nama_pemilik_rekening: '  budi   santoso ',
      nama_ktp:              'Budi Santoso',
    })
    expect(galat).toEqual({})
  })

  it('isi yang benar-benar berbeda DITOLAK, dan pesannya menyebut LABEL kedua kolom', () => {
    const galat = validasiSemuaKolom([NAMA_PEMILIK, NAMA_KTP], {
      nama_pemilik_rekening: 'Budi Santoso',
      nama_ktp:              'Siti Aminah',
    })
    expect(galat.nama_pemilik_rekening).toBe('Nama Pemilik Rekening harus sama dengan Nama Sesuai KTP')
  })

  it('🔴 kolom rujukan TIDAK ikut dirender ⇒ aturan DILEWATI, formulir tidak buntu', () => {
    // Persis keadaan Supabase hari ini: rujukannya `ktp` (tipe image, tidak pernah dirender).
    const barisHidup = kolom({
      field_key:   'nama_pemilik_rekening',
      label:       'Nama Pemilik Rekening',
      validasi:    { max_len: 100, harus_sama_dengan: 'ktp' },
      is_required: true,
    })
    const galat = validasiSemuaKolom([barisHidup], { nama_pemilik_rekening: 'Budi Santoso' })
    expect(galat).toEqual({})
  })

  it('salah satu sisi kosong ⇒ dilewati; yang menagih isian adalah is_required, bukan aturan ini', () => {
    const galat = validasiSemuaKolom([NAMA_PEMILIK, NAMA_KTP], {
      nama_pemilik_rekening: 'Budi Santoso',
      nama_ktp:              '   ',
    })
    expect(galat.nama_pemilik_rekening).toBeUndefined()
    expect(galat.nama_ktp).toBe('Nama Sesuai KTP wajib diisi')
  })

  it('galat yang sudah ada dari aturan lain TIDAK ditimpa pesan lintas-kolom', () => {
    const pendek = kolom({
      field_key:   'nama_pemilik_rekening',
      label:       'Nama Pemilik Rekening',
      validasi:    { min_len: 20, harus_sama_dengan: 'nama_ktp' },
      is_required: true,
    })
    const galat = validasiSemuaKolom([pendek, NAMA_KTP], {
      nama_pemilik_rekening: 'Budi',
      nama_ktp:              'Siti Aminah',
    })
    expect(galat.nama_pemilik_rekening).toBe('Nama Pemilik Rekening minimal 20 karakter')
  })

  it('kolom tanpa harus_sama_dengan tidak tersentuh sama sekali', () => {
    const galat = validasiSemuaKolom([NAMA_KTP], { nama_ktp: 'Budi Santoso' })
    expect(galat).toEqual({})
  })
})
