// components/superadmin/FormFieldRegistryClient/FormFieldRegistryClient.kontrak.ts
// ---------------------------------------------------------------------------
// Lahir: Sesi #489 - pemecahan `components/superadmin/FormFieldRegistryClient.tsx`
//   (13.266 B = 129,55% plafon kode 10.240 B, hutang #97). Commit tersendiri,
//   NOL perubahan perilaku. Bentuk folder + `index.ts` sebagai MASTER: ATURAN 50.5
//   (>=3 pecahan WAJIB folder + MASTER; pasal itu menyebut kode secara eksplisit).
//   Isi di bawah DIPINDAH byte-exact oleh program dari berkas asal - nol karakter
//   diketik ulang, nol kalimat diringkas, urutan asli dipertahankan.
//   Arsip byte-exact asal: _arsip/coding-history/sesi-489-pecah-form-field-registry-client/
// ISI BERKAS INI: baris 44-69 berkas asal - bentuk data + keempat saklar.
// ---------------------------------------------------------------------------

import type { FormFieldRow } from '@/lib/types/form-field-registry.types'

export interface FormFieldGroupData {
  group_key: string
  fields:    FormFieldRow[]
}

/** Keempat saklar yang boleh digeser SA. Nama sengaja sama dengan nama kolom DB. */
type SaklarKey = 'is_visible' | 'is_required' | 'butuh_verifikasi_admin' | 'is_active'

const SAKLAR: { key: SaklarKey; judul: string; keterangan: string }[] = [
  { key: 'is_visible',             judul: 'Tampil',     keterangan: 'Kolom formulir ini muncul di formulir pendaftaran' },
  { key: 'is_required',            judul: 'Wajib',      keterangan: 'Pendaftar tidak bisa lanjut tanpa mengisinya' },
  { key: 'butuh_verifikasi_admin', judul: 'Verifikasi', keterangan: 'Diperiksa manusia; bukan sekadar pernyataan pendaftar' },
  { key: 'is_active',              judul: 'Aktif',      keterangan: 'Kolom formulir ini dipakai sama sekali — dimatikan berarti berhenti divalidasi' },
]

/** Judul saklar dari kuncinya. Sumber tunggalnya tetap SAKLAR di atas — tidak disalin. */
function judulSaklar(key: SaklarKey): string {
  for (const s of SAKLAR) if (s.key === key) return s.judul
  return key
}

/** Satu butir peringatan: kolom ber-dasar-hukum + nama saklar yang SEDANG dimatikan padanya. */
interface PeringatanBaris {
  field:     FormFieldRow
  dimatikan: string[]
}

// Ekspor ditambahkan S#489 supaya pecahan saudaranya bisa memakainya.
// Baris di atas TIDAK disentuh (uji balik byte-identik).
export type { SaklarKey, PeringatanBaris }
export { SAKLAR, judulSaklar }
