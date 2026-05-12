// lib/types/tenant-pic.types.ts
// Tipe data untuk M6 Tenant Management — entitas PIC (Person In Charge)
// Dipakai oleh: tenant-pic.repository.ts, tenant-pic.service.ts, API routes M6, Tab PIC UI
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.2

// ─── Literal Types ────────────────────────────────────────────────────────────

export type PICTipe = 'utama' | 'cadangan'

export type PICRelasiPerusahaan =
  | 'owner'
  | 'direktur'
  | 'karyawan'
  | 'konsultan'
  | 'keluarga_pemilik'

export type PICAlasanPergantian =
  | 'resign'
  | 'mutasi'
  | 'promosi'
  | 'restrukturisasi'
  | 'kontrak_berakhir'
  | 'lainnya'

// ─── Entitas: Riwayat PIC (full row DB) ──────────────────────────────────────

export interface TenantPICHistory {
  id:                    string
  tenant_id:             string
  user_id:               string | null        // NULL = akun belum dibuat (baru diundang)
  user_name:             string
  user_email:            string | null
  user_wa:               string | null
  jabatan:               string | null
  relasi_ke_perusahaan:  PICRelasiPerusahaan | null
  tipe_pic:              PICTipe
  started_at:            string
  ended_at:              string | null         // NULL = masih aktif sebagai PIC
  replaced_by_user_id:   string | null
  replaced_by_name:      string | null
  alasan_pergantian:     PICAlasanPergantian | null
  tanggal_efektif:       string | null
  dokumen_serah_terima:  string | null         // URL Cloudinary
  catatan:               string | null
  assigned_by:           string | null
  created_at:            string
}

// ─── PIC Aktif (ringkasan untuk kartu PIC di UI) ─────────────────────────────

export interface PICKartu {
  id:                   string                // ID riwayat PIC
  tenant_id:            string
  user_id:              string | null
  user_name:            string
  user_email:           string | null
  user_wa:              string | null
  jabatan:              string | null
  relasi_ke_perusahaan: PICRelasiPerusahaan | null
  tipe_pic:             PICTipe
  started_at:           string
  // Status koneksi ke platform
  sudah_aktivasi:       boolean               // user_id != null AND user aktif di platform
}

// ─── Entry Riwayat PIC (untuk timeline audit) ─────────────────────────────────

export interface PICTimelineEntry {
  id:                   string
  tipe_event:           'awal' | 'pergantian' | 'resign' | 'cadangan_ditambah' | 'cadangan_dihapus'
  nama_pic:             string
  tipe_pic:             PICTipe
  started_at:           string
  ended_at:             string | null
  alasan:               string | null
  dicatat_oleh:         string | null          // nama SuperAdmin
  dokumen_url:          string | null
}

// ─── Payload Wizard Ganti PIC — Step 1: Data PIC Baru ────────────────────────

export interface WizardGantiPICStep1 {
  user_name:             string
  jabatan:               string | null
  relasi_ke_perusahaan:  PICRelasiPerusahaan
  user_wa:               string
  user_email:            string
}

// ─── Payload Wizard Ganti PIC — Step 2: Alasan & Tanggal ─────────────────────

export interface WizardGantiPICStep2 {
  alasan_pergantian:     PICAlasanPergantian
  tanggal_efektif:       string              // format YYYY-MM-DD, tidak retroaktif
  dokumen_serah_terima:  string | null       // URL Cloudinary setelah upload
  catatan:               string | null
}

// ─── Payload Lengkap Ganti PIC (gabungan Step 1+2, dikirim ke SP) ─────────────

export interface GantiPICPayload extends WizardGantiPICStep1, WizardGantiPICStep2 {
  tenant_id:  string
  tipe_pic:   PICTipe        // default 'utama'
}

// ─── Preview Notifikasi WA (ditampilkan di Step 2 sebelum submit) ─────────────

export interface PICNotifPreview {
  ke_pic_lama:   string      // teks WA ke PIC lama
  ke_pic_baru:   string      // teks WA ke PIC baru (berisi tautan aktivasi)
  ke_owner:      string | null  // teks WA ke owner (jika berbeda dari PIC)
}

// ─── Response: Data Tab PIC ────────────────────────────────────────────────────

export interface TenantPICTabData {
  pic_utama:          PICKartu | null
  pic_cadangan:       PICKartu | null
  timeline:           PICTimelineEntry[]
  ada_peringatan:     boolean          // true jika tidak ada PIC cadangan
}
