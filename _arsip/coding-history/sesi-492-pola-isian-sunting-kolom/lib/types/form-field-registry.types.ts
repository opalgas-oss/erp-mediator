// lib/types/form-field-registry.types.ts
// Tipe untuk Field Registry — kolom formulir yang dikelola SuperAdmin dari dashboard.
// Tabel: public.form_field_registry (migrasi s483_create_form_field_registry).
//
// Dibuat: Sesi #483 — K-483-4 (Philips). Verbatim: "ini semua harus bisa di maintaince oleh SA,
//   lewat dashboard… kalau kamu seperti ini, maka aplikasi ini akan selalu bongkar ulang".
// ⇒ Kolom formulir adalah DATA, bukan keputusan yang dibekukan di kode.
//
// GENERIK lewat form_key: register_vendor · register_user · order_form · bidding_vendor
//   memakai satu tabel dan satu halaman SA yang sama.
// Rumah standarnya: Arsitektur_Project/02_Functional/01_Auth_Akses/STANDAR_REGISTRASI_VENDOR_v1.md §4

/** Jenis input yang boleh dipakai. Dijaga CHECK constraint di DB — jangan menambah di sini saja. */
export type FormFieldTipeInput =
  | 'text' | 'textarea' | 'number' | 'boolean'
  | 'select' | 'multiselect' | 'file' | 'image' | 'date'

/** Baris mentah form_field_registry, apa adanya dari Supabase. */
export interface FormFieldRow {
  id:                     string
  form_key:               string
  field_key:              string
  group_key:              string
  label:                  string
  deskripsi:              string | null
  placeholder:            string | null
  tipe_input:             FormFieldTipeInput
  sumber_opsi:            string | null
  urutan:                 number
  is_visible:             boolean
  is_required:            boolean
  is_active:              boolean
  butuh_verifikasi_admin: boolean
  validasi:               Record<string, unknown>
  /** INFORMASI yang ditampilkan sebagai peringatan saat SA mematikan kolom. TIDAK mengunci. */
  dasar_hukum:            string | null
  catatan_risiko:         string | null
  /** Penanda saja — membuat peringatan lebih tegas. TIDAK mengunci (K-483-4). */
  is_system:              boolean
}

/**
 * Bentuk RAMPING satu kolom untuk formulir yang dilihat pemakai — HANYA medan yang benar-benar
 * dibaca layar. Lahir S#489 dari temuan #111: `/register` mengoper `FormFieldRow` UTUH ke komponen
 * klien, jadi `dasar_hukum` dan `catatan_risiko` — dua kolom yang gunanya hanya untuk peringatan di
 * layar SuperAdmin — ikut terbaca siapa pun yang membuka sumber halaman.
 * Diukur 3 Sep 2026 atas RegisterClient + KolomFormulir + validasi-form-field: sisi klien memakai
 * DELAPAN medan di bawah; SEPULUH medan lain menyeberang tanpa satu pun pembaca —
 * `id` `form_key` `urutan` `is_visible` `is_active` `butuh_verifikasi_admin` `sumber_opsi`
 * `dasar_hukum` `catatan_risiko` `is_system`.
 * 🔴 Ia SUBSET `FormFieldRow`, jadi pemanggil server boleh mengoper baris utuh apa adanya.
 */
export interface FormFieldPublik {
  field_key:   string
  group_key:   string
  label:       string
  deskripsi:   string | null
  placeholder: string | null
  tipe_input:  FormFieldTipeInput
  is_required: boolean
  validasi:    Record<string, unknown>
}

/** Empat saklar yang boleh diubah SA dari dashboard, plus urutan. */
export interface FormFieldSaklarPatch {
  id:                      string
  is_visible?:             boolean
  is_required?:            boolean
  is_active?:              boolean
  butuh_verifikasi_admin?: boolean
  urutan?:                 number
}
