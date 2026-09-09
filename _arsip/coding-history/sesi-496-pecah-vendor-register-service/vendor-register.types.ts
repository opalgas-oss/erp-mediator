// lib/types/vendor-register.types.ts
// Tipe pendaftaran vendor publik — Tahap 1 (Opsi B), Sesi #486.
//
// Rumah spesifikasinya: Arsitektur_Project/02_Functional/01_Auth_Akses/SPEK_FORMULIR_REGISTER_VENDOR_v1.md
//
// 🔴 Jawaban pendaftar adalah DATA, bukan kolom tabel (SPEK §3 K3). Menambah kolom formulir
//   = menambah baris di form_field_registry, ⛔ BUKAN mengubah tipe di berkas ini.

/** Satu opsi untuk kolom `select` / `multiselect`. Sumbernya diterjemahkan di service opsi. */
export interface OpsiPilihan {
  nilai: string
  label: string
}

/** Nilai satu kolom formulir apa adanya dari layar. */
export type NilaiJawaban = string | string[] | boolean | null

/** Satu jawaban: kunci kolom + nilainya. `field_key` divalidasi ke Field Registry di server. */
export interface JawabanKolom {
  field_key: string
  nilai:     NilaiJawaban
}

/** Tiga kotak centang terpisah — ⛔ nol yang boleh tercentang otomatis (UU PDP Ps 20(2)a · 22(4)a). */
export interface PersetujuanVendor {
  snk:           boolean
  data_pribadi:  boolean
  pasal_3_3:     boolean
}

/**
 * Isi kiriman formulir pendaftaran vendor.
 * 🔴 S#494 — `akun.nama` DICABUT. Nama vendor bukan lagi medan akun yang diketik terpisah;
 *   ia jawaban kolom formulir yang Config Registry tunjuk
 *   (`register_vendor` / `kolom_sumber_nama_profil`, hari ini `nama_ktp`).
 *   Sebabnya perintah Philips: "Nama Lengkap Vendor harus sesuai KTP" — dan cara paling
 *   pasti membuat dua nama sama adalah meniadakan yang kedua, bukan membandingkannya.
 */
export interface VendorRegisterPayload {
  akun: {
    email:    string
    nomor_wa: string
    password: string
  }
  jawaban:     JawabanKolom[]
  persetujuan: PersetujuanVendor
  /** Kolom umpan (honeypot). Terisi ⇒ permintaan robot, ditolak diam-diam. */
  situs_web?:  string
}

/** Hasil pendaftaran yang dipulangkan ke layar. */
export interface HasilPendaftaranVendor {
  submission_id: string
  status:        string
}

/** Satu galat validasi, dipetakan ke kolom yang menyebabkannya. */
export interface GalatValidasi {
  field_key: string
  pesan:     string
}
