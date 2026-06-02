// lib/types/tenant-pic.types.ts
// STUB — Sesi #240 STEP C
// Type PIC cadangan (PICAlasanPergantian dengan 'dihapus', WizardGantiPIC*, GantiPICPayload,
// PICNotifPreview) sudah dihapus — konsep cadangan tidak ada lagi.
//
// Sisa tipe dipertahankan sementara untuk tenant-pic.repository.ts + service.ts stub
// sampai route change-pic dihapus di STEP C-8/C-9.
//
// FIX T2 S#240: TenantPICHistory — kolom tipe_pic sudah DROP dari DB (migration K-19 S#238)
//               Field tipe_pic di interface diubah ke optional nullable untuk backward compat
// Referensi arsip: _arsip/coding-history/sesi-240-hutang-at-auth-step-c/tenant-pic.types.ts

export type PICTipe = 'utama' | 'cadangan'

export type PICRelasiPerusahaan =
  | 'owner'
  | 'direktur'
  | 'karyawan'
  | 'konsultan'
  | 'keluarga_pemilik'

// ─── Entitas: Riwayat PIC (FIX T2: tipe_pic nullable) ────────────────────────

export interface TenantPICHistory {
  id:                    string
  tenant_id:             string
  user_id:               string | null
  user_name:             string
  user_email:            string | null
  user_wa:               string | null
  jabatan:               string | null
  relasi_ke_perusahaan:  PICRelasiPerusahaan | null
  tipe_pic?:             PICTipe | null       // FIX T2: opsional — kolom sudah di-DROP dari DB
  started_at:            string
  ended_at:              string | null
  replaced_by_user_id:   string | null
  replaced_by_name:      string | null
  alasan_pergantian:     string | null
  tanggal_efektif:       string | null
  dokumen_serah_terima:  string | null
  catatan:               string | null
  assigned_by:           string | null
  created_at:            string
}

// ─── PIC Aktif (ringkasan untuk kartu) ───────────────────────────────────────

export interface PICKartu {
  id:                   string
  tenant_id:            string
  user_id:              string | null
  user_name:            string
  user_email:           string | null
  user_wa:              string | null
  jabatan:              string | null
  relasi_ke_perusahaan: PICRelasiPerusahaan | null
  tipe_pic:             PICTipe | null        // FIX T2: nullable
  started_at:           string
  sudah_aktivasi:       boolean
}

export interface PICTimelineEntry {
  id:           string
  tipe_event:   'awal' | 'pergantian' | 'resign' | 'cadangan_ditambah' | 'cadangan_dihapus'
  nama_pic:     string
  tipe_pic:     PICTipe | null
  started_at:   string
  ended_at:     string | null
  alasan:       string | null
  dicatat_oleh: string | null
  dokumen_url:  string | null
}

// ─── Response: Data Tab PIC (stub — dipertahankan sementara) ─────────────────

export interface TenantPICTabData {
  pic_utama:      PICKartu | null
  pic_cadangan:   PICKartu | null
  timeline:       PICTimelineEntry[]
  ada_peringatan: boolean
}
