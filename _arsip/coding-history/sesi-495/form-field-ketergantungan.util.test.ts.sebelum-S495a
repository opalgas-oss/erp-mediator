// Uji penjagaan ketergantungan antar-kolom — S#494, perintah Philips "perbaiki saklar Tampil".
import { describe, expect, it } from 'vitest'
import {
  periksaKetergantungan, terapkanPatch, TIPE_BISA_DIBANDINGKAN,
  type BarisKetergantungan,
} from './form-field-ketergantungan.util'

function baris(s: Partial<BarisKetergantungan> & { field_key: string }): BarisKetergantungan {
  return {
    id: `id-${s.field_key}`, label: s.field_key, tipe_input: 'text',
    is_visible: true, is_required: true, is_active: true, validasi: {}, ...s,
  }
}

const NAMA_KTP = baris({ field_key: 'nama_ktp', label: 'Nama Sesuai KTP' })
const NAMA_REK = baris({
  field_key: 'nama_pemilik_rekening', label: 'Nama Pemilik Rekening',
  validasi: { max_len: 100, harus_sama_dengan: 'nama_ktp' },
})
const KTP_GAMBAR = baris({ field_key: 'ktp', label: 'Foto KTP', tipe_input: 'image', is_visible: false })
const WAJIB = ['nama_ktp']

describe('terapkanPatch — keadaan AKHIR, bukan potongan yang dikirim', () => {
  it('baris yang tidak ikut dikirim TIDAK berubah', () => {
    const hasil = terapkanPatch([NAMA_KTP, NAMA_REK], [{ id: 'id-nama_ktp', is_visible: false }])
    expect(hasil.find(b => b.field_key === 'nama_ktp')!.is_visible).toBe(false)
    expect(hasil.find(b => b.field_key === 'nama_pemilik_rekening')!.is_visible).toBe(true)
  })
  it('medan yang tidak ada di patch memakai nilai lama, bukan undefined', () => {
    const hasil = terapkanPatch([NAMA_KTP], [{ id: 'id-nama_ktp', is_required: false }])
    expect(hasil[0].is_visible).toBe(true)
    expect(hasil[0].is_active).toBe(true)
    expect(hasil[0].is_required).toBe(false)
  })
})

describe('R1 — kolom rujukan tidak boleh dimatikan diam-diam', () => {
  it('keadaan sehat ⇒ null', () => {
    expect(periksaKetergantungan([NAMA_KTP, NAMA_REK, KTP_GAMBAR], WAJIB)).toBeNull()
  })

  it('🔴 SA mematikan Tampil pada kolom rujukan ⇒ DITOLAK, pesannya menyebut kedua label', () => {
    const setelah = terapkanPatch([NAMA_KTP, NAMA_REK], [{ id: 'id-nama_ktp', is_visible: false }])
    const pesan = periksaKetergantungan(setelah, [])
    expect(pesan).toContain('Nama Sesuai KTP')
    expect(pesan).toContain('Nama Pemilik Rekening')
    expect(pesan).toContain('tidak dibandingkan')
  })

  it('SA mematikan Aktif pada kolom rujukan ⇒ DITOLAK juga', () => {
    const setelah = terapkanPatch([NAMA_KTP, NAMA_REK], [{ id: 'id-nama_ktp', is_active: false }])
    expect(periksaKetergantungan(setelah, [])).not.toBeNull()
  })

  it('kolom rujukan hilang sama sekali ⇒ DITOLAK dengan pesan yang berbeda', () => {
    const pesan = periksaKetergantungan([NAMA_REK], [])
    expect(pesan).toContain('tidak ada lagi di formulir ini')
  })

  it('rujukan ke kolom bertipe gambar ⇒ DITOLAK (cacat asal hutang #128)', () => {
    const rek = { ...NAMA_REK, validasi: { harus_sama_dengan: 'ktp' } }
    const ktpHidup = { ...KTP_GAMBAR, is_visible: true }
    const pesan = periksaKetergantungan([ktpHidup, rek], [])
    expect(pesan).toContain('image')
    expect(pesan).toContain('tidak bisa dibandingkan')
  })

  it('KEDUA kolom dimatikan bersamaan ⇒ LOLOS, SA tidak dibuat buntu', () => {
    const setelah = terapkanPatch([NAMA_KTP, NAMA_REK], [
      { id: 'id-nama_ktp', is_visible: false }, { id: 'id-nama_pemilik_rekening', is_visible: false },
    ])
    expect(periksaKetergantungan(setelah, [])).toBeNull()
  })

  it('aturan dicabut lalu kolomnya dimatikan dalam SATU kiriman ⇒ LOLOS', () => {
    const setelah = terapkanPatch([NAMA_KTP, NAMA_REK], [
      { id: 'id-nama_pemilik_rekening', validasi: { max_len: 100 } },
      { id: 'id-nama_ktp', is_visible: false },
    ])
    expect(periksaKetergantungan(setelah, [])).toBeNull()
  })

  it('kolom X sendiri yang dimatikan ⇒ aturannya ikut berhenti, LOLOS', () => {
    const setelah = terapkanPatch([NAMA_KTP, NAMA_REK], [
      { id: 'id-nama_pemilik_rekening', is_visible: false }, { id: 'id-nama_ktp', is_visible: false },
    ])
    expect(periksaKetergantungan(setelah, [])).toBeNull()
  })
})

describe('R2 — kolom yang aplikasi baca sendiri', () => {
  it('🔴 mematikan Tampil pada kolom sumber nama profil ⇒ DITOLAK', () => {
    const setelah = terapkanPatch([NAMA_KTP], [{ id: 'id-nama_ktp', is_visible: false }])
    const pesan = periksaKetergantungan(setelah, WAJIB)
    expect(pesan).toContain('Nama Sesuai KTP')
    expect(pesan).toContain('aplikasi membacanya sendiri')
  })
  it('mematikan saklar Wajib pun DITOLAK', () => {
    const setelah = terapkanPatch([NAMA_KTP], [{ id: 'id-nama_ktp', is_required: false }])
    expect(periksaKetergantungan(setelah, WAJIB)).not.toBeNull()
  })
  it('kunci yang tidak ada di formulir ini DILEWATI, bukan menggagalkan', () => {
    expect(periksaKetergantungan([NAMA_KTP], ['kolom_entah_apa'])).toBeNull()
  })
})

describe('rumah tunggal tipe yang bisa dibandingkan', () => {
  it('hanya text dan textarea', () => {
    expect(TIPE_BISA_DIBANDINGKAN).toEqual(['text', 'textarea'])
  })
})
