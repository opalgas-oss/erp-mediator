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

// ─── Dialog sunting label/aturan — S#493, butir 1b ────────────────────────────

/** Satu baris pola pada dialog. Semua medan teks: dialog tidak menghitung, ia mengumpulkan. */
export interface PolaBaris {
  nama:           string
  parameter:      Record<string, string>
  berlaku_sejak:  string
  berlaku_sampai: string
  sumber:         string
}

/** Keadaan dialog untuk SATU baris kolom formulir. */
export interface DraftSunting {
  id:                string
  label:             string
  pola:              PolaBaris[]
  min_len:           string
  max_len:           string
  min_items:         string
  max_items:         string
  tampilan:          'apa_adanya' | 'disamarkan'
  harus_sama_dengan: string
  harus_true:        boolean
  /** Kunci `validasi` yang dialog TIDAK render — dibawa utuh, ⛔ tidak dibuang. */
  lain:              Record<string, unknown>
}

/** Kunci `validasi` yang benar-benar dirender dialog. Sisanya masuk `lain`. */
export const KUNCI_DIRENDER = new Set([
  'pola', 'min_len', 'max_len', 'min_items', 'max_items',
  'tampilan', 'harus_sama_dengan', 'harus_true',
])

/** Bagian dialog yang menyala untuk sebuah `tipe_input`. */
export interface MedanDialog {
  pola:         boolean
  panjang:      boolean
  tampilan:     boolean
  samaDengan:   boolean
  pilihan:      boolean
  wajibCentang: boolean
}

/**
 * 🔴 K-492-T8 — DIALOG DILARANG MENAWARKAN MEDAN YANG BELUM PUNYA PENEGAK.
 *   Yang menyala di bawah HANYA aturan yang benar-benar dijalankan hari ini:
 *   `pola[]` · `min_len`/`max_len` · `min_items`/`max_items` · `harus_true`
 *   (`validasi-form-field.util.ts`), `tampilan` dan `harus_sama_dengan` (penegaknya
 *   lahir S#493, commit sebelum ini).
 * ⛔ `number` · `date` · `file` · `image` sengaja NOL medan — batas nilai, batas tanggal,
 *   `maks_mb`, `tipe`, dan `kamera_langsung` belum punya penegak (hutang #128), dan kolom
 *   bertipe berkas belum dirender sama sekali di Tahap 1. Menawarkannya = dashboard
 *   berbohong kepada SA (ATURAN 34). Mockup v3 Keadaan 4 menggambarnya; ia dirancang
 *   sebelum T-492-1 mengukur bahwa penegaknya nol.
 */
export function medanUntukTipe(tipe: string): MedanDialog {
  const mati: MedanDialog = {
    pola: false, panjang: false, tampilan: false,
    samaDengan: false, pilihan: false, wajibCentang: false,
  }
  if (tipe === 'text' || tipe === 'textarea') {
    return { ...mati, pola: true, panjang: true, tampilan: true, samaDengan: true }
  }
  if (tipe === 'select' || tipe === 'multiselect') return { ...mati, pilihan: true }
  if (tipe === 'boolean') return { ...mati, wajibCentang: true }
  return mati
}

/** Apakah ada satu pun medan aturan yang bisa disunting untuk tipe ini. */
export function adaMedanAturan(m: MedanDialog): boolean {
  return m.pola || m.panjang || m.tampilan || m.samaDengan || m.pilihan || m.wajibCentang
}
