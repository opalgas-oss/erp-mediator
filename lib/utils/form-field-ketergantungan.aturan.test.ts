// Uji aturan R4 — S#497, butir 2 pada urutan `KERJA_SESI_495_REKOMENDASI.md` §7.2.
//
// 🔴 BERKAS TERSENDIRI, SEBABNYA DIUKUR: `form-field-ketergantungan.util.test.ts` terukur
//   7.779 B = 76,0% plafon kode 10.240 B sesudah tanda tangan `SetelanPenjagaan` masuk;
//   menumpuk uji R4 di sana melewatkannya dari ambang tindakan 8.192 B.
// 🔴 UJI WAJIB MENGUNCI DUA ARAH: menolak saat kunci `false`, DAN MELEPAS saat `true`.
//   Arah kedua itu yang membuktikan R4 penjaga SYARAT, ⛔ bukan pengunci kolom (K-483-4).
//   Tanpa arah kedua, ia hanya diklaim.
// ⚠️ Pabrik `berkas()` di bawah SENGAJA lokal, ⛔ tidak dibagi dengan berkas uji saudaranya:
//   fixture uji bukan logika bersama, dan menyatukannya mengikat dua berkas uji yang menguji
//   aturan berbeda. Nilai bawaannya pun berbeda — di sini kolom BERKAS, di sana kolom teks.

import { describe, expect, it } from 'vitest'
import { periksaKetergantungan, terapkanPatch, type BarisKetergantungan } from './form-field-ketergantungan.util'

function berkas(s: Partial<BarisKetergantungan> & { field_key: string }): BarisKetergantungan {
  return {
    id: `id-${s.field_key}`, label: s.field_key, tipe_input: 'file',
    is_visible: true, is_required: false, is_active: true,
    butuh_verifikasi_admin: true, validasi: {}, ...s,
  }
}
const setelan = (layarVerifikasiBerkasAktif: boolean) =>
  ({ kunciWajibHidup: [], layarVerifikasiBerkasAktif })

// Nama & sifat kedelapan kolom di bawah DIUKUR `SELECT form_field_registry` 9 Sep 2026,
// ⛔ bukan disalin dari dokumen (T-496-1).
const KTP        = berkas({ field_key: 'ktp', label: 'Foto KTP', tipe_input: 'image' })
const SKCK       = berkas({ field_key: 'skck', label: 'SKCK' })
const SERTIFIKAT = berkas({ field_key: 'sertifikat_kompetensi', label: 'Sertifikat Kompetensi',
                            butuh_verifikasi_admin: false })
const NIB        = berkas({ field_key: 'nib', label: 'Nomor Induk Berusaha (NIB)', tipe_input: 'text',
                            is_required: true })

describe('R4 — kolom berkas yang wajib diperiksa admin vs layar pemeriksanya', () => {
  it('🔴 kolom gambar hidup + layar BELUM aktif ⇒ DITOLAK, pesannya menyebut label + jalan keluar', () => {
    const pesan = periksaKetergantungan([KTP], setelan(false))
    expect(pesan).toContain('Foto KTP')
    expect(pesan).toContain('layar verifikasi berkas belum dinyatakan aktif')
    expect(pesan).toContain('Matikan saklar Tampil')
  })

  it('kolom file hidup + layar BELUM aktif ⇒ DITOLAK juga', () => {
    expect(periksaKetergantungan([SKCK], setelan(false))).not.toBeNull()
  })

  it('🔴 ARAH KEDUA — layar DINYATAKAN AKTIF, kolom yang sama hidup ⇒ LOLOS', () => {
    expect(periksaKetergantungan([KTP, SKCK], setelan(true))).toBeNull()
  })

  it('🔴 kolom TEKS ber-Verifikasi yang hidup ⇒ LOLOS — `nib` tidak membuat panel buntu (K-497-T1)', () => {
    expect(periksaKetergantungan([NIB], setelan(false))).toBeNull()
  })

  it('kolom Tahap A (Verifikasi mati) hidup ⇒ LOLOS walau layar belum aktif', () => {
    expect(periksaKetergantungan([SERTIFIKAT], setelan(false))).toBeNull()
  })

  it('kolom berkas ber-Verifikasi yang Tampil-nya mati ⇒ LOLOS', () => {
    expect(periksaKetergantungan([berkas({ field_key: 'skck', is_visible: false })], setelan(false))).toBeNull()
  })

  it('kolom berkas ber-Verifikasi yang Aktif-nya mati ⇒ LOLOS', () => {
    expect(periksaKetergantungan([berkas({ field_key: 'skck', is_active: false })], setelan(false))).toBeNull()
  })

  it('SA mematikan Tampil lewat patch ⇒ LOLOS, SA punya jalan keluar', () => {
    const setelahPatch = terapkanPatch([KTP], [{ id: 'id-ktp', is_visible: false }])
    expect(periksaKetergantungan(setelahPatch, setelan(false))).toBeNull()
  })

  it('🔴 SA menyalakan Verifikasi lewat patch pada kolom berkas hidup ⇒ DITOLAK — patch saklar itu SAMPAI', () => {
    const setelahPatch = terapkanPatch([SERTIFIKAT], [{ id: 'id-sertifikat_kompetensi', butuh_verifikasi_admin: true }])
    expect(periksaKetergantungan(setelahPatch, setelan(false))).not.toBeNull()
  })

  it('🟢 keadaan 9 Sep 2026 — kedelapan kolom berkas Tampil-nya mati ⇒ LOLOS, R4 nol menahan hari ini', () => {
    const delapan = ['bukti_standar_teknis', 'sertifikat_kompetensi', 'ktp', 'selfie_dengan_ktp',
                     'skck', 'surat_domisili', 'foto_profil_usaha', 'dokumen_usaha_lain']
      .map((k) => berkas({ field_key: k, is_visible: false }))
    expect(periksaKetergantungan(delapan, setelan(false))).toBeNull()
  })
})
