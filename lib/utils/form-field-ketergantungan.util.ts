// lib/utils/form-field-ketergantungan.util.ts
// Penjagaan KETERGANTUNGAN ANTAR-KOLOM formulir. Dibuat: Sesi #494 atas perintah Philips
//   ("perbaiki saklar Tampil").
//
// 🔴 SEBAB BERKAS INI LAHIR: `form-field-patch.util.ts` memeriksa tiap patch SENDIRI-SENDIRI —
//   ia tidak pernah melihat seluruh formulir. Akibatnya SA bisa mematikan saklar Tampil pada
//   satu kolom dan MEMBUNUH DIAM-DIAM aturan kolom lain yang menunjuknya: penegak
//   `harus_sama_dengan` sengaja MELEWATI aturannya kalau kolom rujukan tidak dirender
//   (K-493-T2, supaya formulir tidak buntu). Kelonggaran itu benar untuk pendaftar, tetapi
//   ia membuat kesalahan SA tidak terlihat oleh siapa pun. Berkas ini yang membuatnya terlihat.
//
// ⛔ MURNI — nol Supabase, nol `server-only`; bisa diuji tanpa menyalakan server.
// ⛔ NOL kebijakan dibekukan: daftar kolom yang tidak boleh dimatikan DIBACA dari Config
//   Registry (`register_vendor` / `kolom_wajib_hidup`), bukan ditulis di sini.

//
// 🔴 DIPECAH S#497 (ATURAN 50/53), SEBABNYA DIUKUR: berkas ini terukur **7.565 B = 73,9%**
//   plafon kode 10.240 B, dan aturan **R4** yang menunggu di urutan §7.2 butir 2 pasti
//   menyentuhnya ⇒ dipecah LEBIH DULU, commit tersendiri, ⛔ bukan ditumpuki. Sumbu = ALASAN
//   BERUBAH (ATURAN 54.2/54.4); pola yang sama dipakai S#496 pada `vendor-register.service.ts`.
//     bentuk baris & patch  -> `lib/types/form-field-ketergantungan.types.ts`
//     kosakata + arti HIDUP -> `./form-field-ketergantungan.dasar.ts`
//     isi tiap aturan       -> `./form-field-ketergantungan.aturan.ts`
//     di sini               -> `terapkanPatch` + orkestrator yang memanggilnya berurutan
// ⛔ NOL PERUBAHAN PERILAKU pada pemecahan itu, dan SELURUH jalur impor lama tetap sah
//   (ATURAN 5): apa pun yang dulu diimpor dari berkas ini masih diekspor dari berkas ini.

import type {
  BarisKetergantungan, PatchKetergantungan, SetelanPenjagaan,
} from '@/lib/types/form-field-ketergantungan.types'
import { aturanR1, aturanR2, aturanR3, aturanR4 } from './form-field-ketergantungan.aturan'

export type { BarisKetergantungan, PatchKetergantungan, SetelanPenjagaan }
export { TIPE_BISA_DIBANDINGKAN, TIPE_BUTUH_SUMBER_OPSI } from './form-field-ketergantungan.dasar'

/**
 * Hitung keadaan AKHIR tiap baris sesudah patch diterapkan.
 * ⚠️ WAJIB dipakai sebelum `periksaKetergantungan`: patch hanya membawa medan yang BERUBAH,
 * jadi memeriksa patch saja akan salah menilai baris yang tidak ikut dikirim.
 */
export function terapkanPatch(
  baris:   BarisKetergantungan[],
  patches: PatchKetergantungan[],
): BarisKetergantungan[] {
  const perId = new Map<string, PatchKetergantungan>()
  for (const p of patches) perId.set(p.id, p)
  return baris.map((b) => {
    const p = perId.get(b.id)
    if (!p) return b
    return {
      ...b,
      is_visible:  p.is_visible  ?? b.is_visible,
      is_required: p.is_required ?? b.is_required,
      is_active:   p.is_active   ?? b.is_active,
      butuh_verifikasi_admin: p.butuh_verifikasi_admin ?? b.butuh_verifikasi_admin,
      validasi:    p.validasi    ?? b.validasi,
    }
  })
}

/**
 * Periksa keadaan AKHIR satu formulir. Memulangkan pesan galat untuk SA, atau `null` kalau sehat.
 * Pesannya sengaja menyebut LABEL (yang SA lihat di layar), ⛔ bukan `field_key`, dan menyebut
 * cara membetulkannya — bukan sekadar "tidak boleh".
 */
export function periksaKetergantungan(
  barisSetelah: BarisKetergantungan[],
  setelan:      SetelanPenjagaan,
): string | null {
  const perKunci = new Map<string, BarisKetergantungan>()
  for (const b of barisSetelah) perKunci.set(b.field_key, b)

  return aturanR1(barisSetelah, perKunci)
      ?? aturanR2(perKunci, setelan.kunciWajibHidup)
      ?? aturanR3(barisSetelah)
      ?? aturanR4(barisSetelah, setelan.layarVerifikasiBerkasAktif)
}
