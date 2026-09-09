// lib/types/form-field-ketergantungan.types.ts
// Bentuk baris & patch yang penjagaan ketergantungan antar-kolom pakai.
// Dipecah dari `lib/utils/form-field-ketergantungan.util.ts` — S#497. Sebab pemecahan
// ditulis SEKALI di induk itu; ⛔ tidak disalin ke sini (ATURAN 36).

/** Bentuk minimum satu baris yang penjagaan ini butuhkan. */
export interface BarisKetergantungan {
  id:          string
  field_key:   string
  label:       string
  tipe_input:  string
  is_visible:  boolean
  is_required: boolean
  is_active:   boolean
  /**
   * Saklar SA "Verifikasi" — kolom ini diperiksa manusia terhadap pernyataan pendaftar.
   * 🔴 Masuk ke bentuk ini di S#497 karena **R4 membacanya**. Sebelum R4 ia nol pembaca
   *   (hutang #138) dan sengaja tidak ikut; menambahkannya tanpa pembaca melanggar ATURAN 34.
   */
  butuh_verifikasi_admin: boolean
  validasi:    Record<string, unknown>
  /**
   * Alamat sumber opsi kolom pilihan. ⚠️ SENGAJA OPSIONAL, bukan wajib: `FormFieldRow` memuatnya
   * sehingga pemanggil boleh mengoper baris utuh apa adanya, sedangkan baris uji yang tidak
   * mengurusi kolom pilihan tidak perlu menuliskannya. Tidak hadir = diperlakukan kosong.
   */
  sumber_opsi?: string | null
}

/** Patch apa adanya dari muatan PATCH — hanya medan yang berubah yang hadir. */
export interface PatchKetergantungan {
  id:           string
  is_visible?:  boolean
  is_required?: boolean
  is_active?:   boolean
  /**
   * 🔴 IKUT SEJAK S#497, DAN INI PERBAIKAN LUBANG: `saringPerubahan` sudah menerima saklar ini
   *   sejak S#483 (`SAKLAR_BOOLEAN` memuatnya), tetapi bentuk patch di sini tidak — sehingga
   *   `terapkanPatch` membuang perubahannya dan penjagaan menilai NILAI LAMA. Selama nol aturan
   *   membacanya itu tak berakibat; begitu R4 lahir, ia jadi lubang: SA menyalakan Verifikasi
   *   pada kolom berkas yang hidup dan R4 melewatkannya.
   */
  butuh_verifikasi_admin?: boolean
  validasi?:    Record<string, unknown>
}

/**
 * Setelan platform yang dibaca dari Config Registry dan dioper ke penjagaan.
 * 🔴 BERBENTUK OBJEK BERNAMA, bukan deretan parameter: sejak R2 tiap aturan baru cenderung
 *   menambah satu nilai Config, dan deretan parameter boolean tak bernama adalah cara paling
 *   cepat membuat pemanggil salah urut tanpa ketahuan kompilator. Aturan berikutnya menambah
 *   MEDAN di sini, ⛔ bukan parameter baru di tanda tangan `periksaKetergantungan`.
 */
export interface SetelanPenjagaan {
  /** `register_vendor/kolom_wajib_hidup` — kolom yang aplikasi baca sendiri (R2). */
  kunciWajibHidup:            string[]
  /** `register_vendor/layar_verifikasi_berkas_aktif` — layar pemeriksa berkas sudah berdiri (R4). */
  layarVerifikasiBerkasAktif: boolean
}
