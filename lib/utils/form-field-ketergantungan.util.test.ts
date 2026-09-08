// Uji penjagaan ketergantungan antar-kolom — S#494, perintah Philips "perbaiki saklar Tampil".
import { describe, expect, it } from 'vitest'
import {
  periksaKetergantungan, terapkanPatch, TIPE_BISA_DIBANDINGKAN, TIPE_BUTUH_SUMBER_OPSI,
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

describe('R3 — kolom pilihan hidup tanpa sumber opsi (hutang #132)', () => {
  const pilihan = (extra: Partial<BarisKetergantungan> = {}) =>
    baris({ field_key: 'daftar_petugas_lapangan', label: 'Daftar Petugas Lapangan',
            tipe_input: 'multiselect', is_required: false, ...extra })

  it('🔴 multiselect hidup + sumber_opsi tidak ada ⇒ DITOLAK, pesannya menyebut label + aksi nyata', () => {
    const pesan = periksaKetergantungan([pilihan()], [])
    expect(pesan).toContain('Daftar Petugas Lapangan')
    expect(pesan).toContain('TIDAK akan muncul')
    expect(pesan).toContain('matikan saklar Tampil')
  })

  it('sumber_opsi null ⇒ DITOLAK', () => {
    expect(periksaKetergantungan([pilihan({ sumber_opsi: null })], [])).not.toBeNull()
  })

  it('sumber_opsi hanya spasi ⇒ DITOLAK', () => {
    expect(periksaKetergantungan([pilihan({ sumber_opsi: '   ' })], [])).not.toBeNull()
  })

  it('select hidup + sumber_opsi terisi ⇒ LOLOS (kbli bukan urusan R3)', () => {
    const kbli = baris({ field_key: 'kbli', label: 'Klasifikasi KBLI', tipe_input: 'select', sumber_opsi: 'kbli' })
    expect(periksaKetergantungan([kbli], [])).toBeNull()
  })

  it('kolom pilihan yang DIMATIKAN ⇒ LOLOS — SA boleh menyiapkannya lebih dulu', () => {
    expect(periksaKetergantungan([pilihan({ is_visible: false })], [])).toBeNull()
  })

  it('🟢 sesudah tipenya jadi textarea ⇒ LOLOS (perbaikan S#495 butir 1)', () => {
    const sesudah = pilihan({ tipe_input: 'textarea', validasi: { max_len: 1000 } })
    expect(periksaKetergantungan([sesudah], [])).toBeNull()
  })

  it('mematikan Tampil lewat patch ⇒ LOLOS, SA punya jalan keluar', () => {
    const setelah = terapkanPatch([pilihan()], [{ id: 'id-daftar_petugas_lapangan', is_visible: false }])
    expect(periksaKetergantungan(setelah, [])).toBeNull()
  })

  it('kolom teks tanpa sumber_opsi TIDAK tersentuh R3', () => {
    expect(periksaKetergantungan([NAMA_KTP], [])).toBeNull()
  })

  it('daftar tipe yang butuh sumber opsi = select + multiselect', () => {
    expect(TIPE_BUTUH_SUMBER_OPSI).toEqual(['select', 'multiselect'])
  })
})
