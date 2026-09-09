// lib/services/form-field-penjagaan.service.ts
// Membaca SETELAN PLATFORM yang dipakai penjagaan ketergantungan antar-kolom, dari Config Registry.
// Lahir: Sesi #497, bersama aturan R4.
//
// 🔴 SEBAB BERKAS INI ADA — LAPISAN, DAN UKURAN. Rute PATCH `/api/form-fields/[form_key]`
//   membaca Config langsung di dalam dirinya sejak S#494. Satu kunci masih bisa ditolerir; R4
//   membawa kunci KEDUA, dan rutenya terukur 7.553 B = 73,8% plafon kode 10.240 B — menambah
//   pembacaan kedua di sana melewatkannya dari ambang tindakan 8.192 B. Aturan 3 lapis
//   (Route → Service → Repository) sudah menyuruh pembacaan itu turun ke Service; ukuran hanya
//   menagihnya sekarang. ⇒ rutenya JUSTRU MENGECIL oleh commit ini, bukan membengkak.
//
// ⛔ NOL KEBIJAKAN DIBEKUKAN DI SINI. Kedua nilainya milik SA, dibaca dari `config_registry`.
// 🔴 KEDUA KUNCI GAGAL DENGAN BERSUARA, ⛔ bukan diam-diam memakai nilai bawaan (hutang #134):
//   `kolom_wajib_hidup` kosong ⇒ R2 mati tanpa jejak (fail-open, penjaga hilang);
//   `layar_verifikasi_berkas_aktif` hilang ⇒ R4 mengunci semua kolom berkas tanpa alasan yang
//   bisa dibaca SA (fail-closed, tetapi membingungkan). Dua arah kegagalan, satu jawaban:
//   sebutkan kuncinya dan berhenti.

import 'server-only'
import { getConfigValue, parseConfigBoolean } from '@/lib/config-registry'
import { parseMultiValue } from '@/lib/utils/config-page.utils'
import type { SetelanPenjagaan } from '@/lib/types/form-field-ketergantungan.types'

export type HasilSetelanPenjagaan =
  | { ok: true;  setelan: SetelanPenjagaan }
  | { ok: false; kunci: string; pesan: string }

/** Baca kedua setelan sekaligus. Satu kunci bermasalah = seluruh simpanan ditolak. */
export async function bacaSetelanPenjagaan(formKey: string): Promise<HasilSetelanPenjagaan> {
  const kunciWajibHidup = parseMultiValue(await getConfigValue(formKey, 'kolom_wajib_hidup'))
  if (kunciWajibHidup.length === 0) {
    return {
      ok: false,
      kunci: `${formKey}/kolom_wajib_hidup`,
      pesan: 'Kebijakan "kolom yang tidak boleh dimatikan" belum terisi — hubungi pengelola sebelum menyimpan.',
    }
  }

  const layarMentah = await getConfigValue(formKey, 'layar_verifikasi_berkas_aktif')
  if (layarMentah === null) {
    return {
      ok: false,
      kunci: `${formKey}/layar_verifikasi_berkas_aktif`,
      pesan: 'Kebijakan "layar verifikasi berkas aktif" belum terisi — hubungi pengelola sebelum menyimpan.',
    }
  }

  return {
    ok: true,
    setelan: {
      kunciWajibHidup,
      layarVerifikasiBerkasAktif: parseConfigBoolean(layarMentah, false),
    },
  }
}
