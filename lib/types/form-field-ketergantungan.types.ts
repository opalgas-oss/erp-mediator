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
  validasi?:    Record<string, unknown>
}
