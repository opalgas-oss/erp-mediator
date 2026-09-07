// lib/types/form-field-pola.types.ts
// Tipe katalog JENIS pola isian — tabel public.form_field_pola
//   (migrasi s492_create_form_field_pola).
//
// Dibuat: Sesi #492 — K-488-T1b. Ia katalog JENIS, ⛔ bukan katalog identitas:
//   satu baris = satu BENTUK pola (mis. "angka panjang tetap"), sedangkan angka milik
//   satu identitas (NIB 13 digit · NPWP 15 dan 16 · KBLI 5) tinggal di
//   `form_field_registry.validasi.pola[]` bersama masa berlaku dan sumbernya.
// ⇒ SA menambah JENIS baru dari layar, tanpa programmer dan tanpa migrasi
//   (ATURAN 8 pasal 8.2 butir 2 + butir 7).
//
// 🔴 `pola_key` diuji FORMAT (`^[a-z][a-z0-9_]*$`), ⛔ BUKAN daftar nilai tertutup —
//   daftar tertutup hanyalah hardcode yang dipindah tempat (8.2 butir 2).

export type PolaJenisEkspresi = 'regex' | 'mask'

/** Satu parameter yang diminta dialog SA untuk sebuah pola. */
export interface PolaParameterSkema {
  jenis: 'bilangan' | 'teks'
  wajib: boolean
  label: string
  min?:  number
  maks?: number
}

/** Baris mentah form_field_pola, apa adanya dari Supabase. */
export interface FormFieldPolaRow {
  id:              string
  pola_key:        string
  label:           string
  deskripsi:       string | null
  jenis_ekspresi:  PolaJenisEkspresi
  ekspresi:        string
  parameter_skema: Record<string, PolaParameterSkema>
  contoh:          string | null
  pesan_galat:     string
  effective_from:  string
  effective_to:    string | null
  sumber_nama:     string | null
  sumber_url:      string | null
  sumber_tanggal:  string | null
  is_system:       boolean
  is_active:       boolean
}

/**
 * Bentuk RAMPING satu jenis pola untuk yang menyeberang ke komponen klien — pola #111.
 * ⛔ Medan yang nol dibaca layar DILARANG ikut menyeberang: apa pun yang menyeberang
 *   ikut terbaca siapa pun yang membuka sumber halaman.
 * 🔴 Ia SUBSET `FormFieldPolaRow`, jadi pemanggil server boleh mengoper baris utuh apa adanya.
 */
export interface FormFieldPolaPublik {
  pola_key:        string
  label:           string
  jenis_ekspresi:  PolaJenisEkspresi
  ekspresi:        string
  parameter_skema: Record<string, PolaParameterSkema>
  pesan_galat:     string
}

/**
 * Satu pola yang DIPAKAI sebuah kolom formulir — bentuk satu butir `validasi.pola[]`.
 * `nama` menunjuk `form_field_pola.pola_key`. Parameter pola (mis. `panjang`) ikut
 * sebagai kunci tambahan, sesuai `parameter_skema` jenis pola itu.
 */
export interface PolaTerpakai {
  nama:            string
  berlaku_sejak?:  string | null
  berlaku_sampai?: string | null
  sumber?:         string | null
  [parameter: string]: unknown
}
