// app/register/page.tsx
// Pembungkus SERVER halaman pendaftaran. Ditulis ulang isinya: Sesi #486 (Tahap 1 / Opsi B).
// Arsip byte-exact versi lama: _arsip/coding-history/sesi-486-register-vendor/app/register/
//
// ⛔ S#437 — GERBANG MAINTENANCE + `force-dynamic` DICABUT saat halaman ini masih placeholder.
// 🔴 S#486 — `force-dynamic` DIPASANG LAGI, dengan sebab yang BERBEDA dari S#437: halaman ini kini
//   membaca susunan kolom dari Field Registry, dan saklar yang SuperAdmin geser WAJIB terlihat di
//   sini pada permintaan berikutnya (uji penerimaan 1-3 SPEK §4). Ongkosnya kecil: pembacaan DB-nya
//   sendiri sudah ber-cache di layer service.
//
// ❓ KENAPA PEMBUNGKUS SERVER + KOMPONEN KLIEN — keputusan Philips S#437 (Opsi 1), tetap berlaku:
//   isian formulir butuh state ⇒ `'use client'`, sedangkan pembacaan Field Registry + Config
//   WAJIB di server (service-nya `server-only`). Bentuk ini juga pola normal Next.js.

export const dynamic = 'force-dynamic'

import { getSusunanFormulirVendor, kelompokkanKolom, FEATURE_KEY_VENDOR } from '@/lib/services/vendor-register.service'
import { getConfigValue } from '@/lib/config-registry'
import { getMessage }     from '@/lib/message-library'
import RegisterClient     from '@/components/register/RegisterClient'

/** Teks persetujuan hidup sebagai DATA (message_library), ⛔ bukan literal di kode — K-483-4. */
const KUNCI_TEKS    = 'persetujuan_vendor_v1_teks'
const KUNCI_SNK     = 'persetujuan_vendor_v1_centang_snk'
const KUNCI_DATA    = 'persetujuan_vendor_v1_centang_data'
const KUNCI_PASAL33 = 'persetujuan_vendor_v1_centang_pasal33'

export default async function RegisterPage() {
  const [{ kolom, opsi }, namaBadanHukum, teks, snk, data, pasal33] = await Promise.all([
    getSusunanFormulirVendor(),
    getConfigValue(FEATURE_KEY_VENDOR, 'nama_badan_hukum_platform', 'Platform'),
    getMessage(KUNCI_TEKS, ''),
    getMessage(KUNCI_SNK, 'Saya menyetujui Persetujuan Vendor.'),
    getMessage(KUNCI_DATA, 'Saya menyetujui pemrosesan data pribadi saya.'),
    getMessage(KUNCI_PASAL33, 'Saya menyatakan Pasal 3.3.'),
  ])

  // Placeholder [PLATFORM] diisi dari Config Registry — mengganti nama badan hukum kelak
  // = satu suntingan SuperAdmin, ⛔ bukan merevisi naskah dan bukan deploy ulang.
  const teksTerisi = teks.split('[PLATFORM]').join(namaBadanHukum ?? 'Platform')

  return (
    <RegisterClient
      kelompok={kelompokkanKolom(kolom)}
      opsi={opsi}
      teksPersetujuan={teksTerisi}
      labelCentang={{ snk, data, pasal33 }}
    />
  )
}
