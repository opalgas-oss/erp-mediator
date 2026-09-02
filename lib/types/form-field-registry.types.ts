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

/** Empat saklar yang boleh diubah SA dari dashboard, plus urutan. */
export interface FormFieldSaklarPatch {
  id:                      string
  is_visible?:             boolean
  is_required?:            boolean
  is_active?:              boolean
  butuh_verifikasi_admin?: boolean
  urutan?:                 number
}
