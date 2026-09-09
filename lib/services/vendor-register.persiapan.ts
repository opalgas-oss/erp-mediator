// lib/services/vendor-register.persiapan.ts
// Pemeriksaan + penetapan nilai kebijakan SEBELUM satu baris pun ditulis — pendaftaran vendor.
// Lahir: Sesi #496, dari pemecahan kedua `lib/services/vendor-register.service.ts`.
// 🔴 Sebab + angka pemecahannya berumah di induk (blok pemecahan), ⛔ tidak disalin ke sini
//   (ATURAN 36). Isi di bawah DIPINDAH oleh program dari induk — nol karakter diketik ulang.
// Sumbu = ALASAN BERUBAH: berkas ini berubah ketika ATURAN PEMERIKSAAN / NILAI KEBIJAKAN
//   berubah; induk berubah ketika URUTAN TULIS + PEMULIHANNYA berubah.

import 'server-only'
import { getConfigValue }     from '@/lib/config-registry'
import { validasiSemuaKolom } from '@/lib/utils/validasi-form-field.util'
import { findByEmail }        from '@/lib/repositories/user.repository'
import type {
  GagalPendaftaran, HasilPersiapan, NilaiJawaban, VendorRegisterPayload,
} from '@/lib/types/vendor-register.types'
export type { GagalPendaftaran }
import { FEATURE_KEY_VENDOR, getSusunanFormulirVendor } from '@/lib/services/vendor-register.susunan'

/**
 * 🔴 Urutannya bagian dari kontraknya: apa pun yang bisa gagal wajib gagal DI SINI, selagi
 * belum ada satu baris pun yang perlu di-rollback. Galat per-kolom dilempar sebagai `Error`
 * ber-`GagalPendaftaran`; sisanya `Error` biasa.
 */
export async function siapkanPendaftaran(
  payload: VendorRegisterPayload,
  tenantIdDariDomain?: string | null,
): Promise<HasilPersiapan> {
  const { kolom, katalogPola } = await getSusunanFormulirVendor()

  // 1) Jawaban disaring ke kolom yang benar-benar berlaku — sisanya dibuang tanpa dicatat.
  const jawaban: Record<string, NilaiJawaban> = {}
  const kunciSah = new Set(kolom.map((k) => k.field_key))
  for (const j of payload.jawaban) {
    if (kunciSah.has(j.field_key)) jawaban[j.field_key] = j.nilai
  }

  // 2) Validasi ulang di server — layar boleh dilewati, ini tidak.
  const galatKolom = validasiSemuaKolom(kolom, jawaban, katalogPola)
  if (Object.keys(galatKolom).length > 0) {
    const gagal: GagalPendaftaran = { pesan: 'Ada isian yang belum benar', galatKolom }
    throw Object.assign(new Error(gagal.pesan), gagal)
  }

  // 3) Persetujuan: ketiganya wajib, ⛔ nol yang boleh dianggap tercentang.
  const { snk, data_pribadi, pasal_3_3 } = payload.persetujuan
  if (!snk || !data_pribadi || !pasal_3_3) {
    throw new Error('Ketiga pernyataan persetujuan wajib dicentang')
  }

  // 4) Email belum boleh terdaftar.
  const emailNormal = payload.akun.email.trim().toLowerCase()
  const sudahAda = await findByEmail(emailNormal)
  if (sudahAda) throw new Error('Email sudah terdaftar. Gunakan email lain atau masuk.')

  // 5) Nilai kebijakan dari Config Registry — ⛔ bukan dari kode.
  const [statusAwal, versiTeks, tenantConfig, versiAturan, kunciSumberNama] = await Promise.all([
    getConfigValue(FEATURE_KEY_VENDOR, 'status_awal_pendaftar', 'pending'),
    getConfigValue(FEATURE_KEY_VENDOR, 'versi_teks_persetujuan'),
    getConfigValue(FEATURE_KEY_VENDOR, 'tenant_id_pendaftar_publik'),
    getConfigValue(FEATURE_KEY_VENDOR, 'versi_aturan_formulir'),
    // ⚠️ Fallback WAJIB ada: `getConfigValues` menelan galat Supabase dan memulangkan `{}`,
    //   lalu `{}` itu ikut ter-cache 300 detik. Tanpa fallback, satu kedipan jaringan
    //   mematikan seluruh corong pendaftaran selama lima menit.
    getConfigValue(FEATURE_KEY_VENDOR, 'kolom_sumber_nama_profil', 'nama_ktp'),
  ])
  const tenantId = tenantIdDariDomain ?? tenantConfig
  if (!tenantId) {
    throw new Error('Konfigurasi tenant pendaftar publik belum diisi — hubungi pengelola')
  }

  // 5b) NAMA PROFIL — S#494, perintah Philips "Nama Lengkap Vendor harus sesuai KTP".
  //   Nama vendor tidak lagi diketik terpisah di Data Akun; ia jawaban kolom formulir yang
  //   Config Registry tunjuk ⇒ nama profil dan nama KTP tidak mungkin lagi berbeda.
  //   🔴 Dihitung SEBELUM akun auth lahir (langkah 6) — gagal sesudahnya = akun yatim.
  //   ⛔ Tipenya diperiksa dulu: `NilaiJawaban` boleh larik/boolean, dan `.trim()` atasnya
  //   melempar TypeError yang jadi 500 dari rute PUBLIK.
  //   ⚠️ GAGAL-AMAN: kolom itu dimatikan ⇒ pendaftaran TIDAK dimatikan, nama memakai email
  //   dan sebabnya dicatat. Yang MENCEGAH keadaan itu = R2 di rute PATCH panel Kolom Formulir.
  const nilaiNama  = jawaban[kunciSumberNama ?? 'nama_ktp']
  const namaProfil = typeof nilaiNama === 'string' ? nilaiNama.trim() : ''
  if (!namaProfil) {
    console.error(
      `[vendor-register.service] kolom sumber nama "${kunciSumberNama}" kosong/tidak dirender ` +
      '— nama profil memakai email. Periksa Konfigurasi › Kolom Formulir.',
    )
  }
  const namaDipakai = namaProfil || emailNormal

  return {
    kolom, katalogPola, jawaban, emailNormal,
    tenantId, statusAwal, versiTeks, versiAturan, namaDipakai,
  }
}
