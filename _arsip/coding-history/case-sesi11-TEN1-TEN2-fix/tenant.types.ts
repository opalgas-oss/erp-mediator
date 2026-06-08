// lib/types/tenant.types.ts — ARSIP pre-TEN1-TEN2-fix (CASE SESI-11, 8 Juni 2026)
// Perubahan yang akan dilakukan: BuatTenantPayload pic_name/email/wa → admintenant_name/email/wa

// lib/types/tenant.types.ts
export type TenantLifecycleStatus =
  | 'in_registration'
  | 'pending'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'terminated'

export type TenantRegisterStatus =
  | 'pending'
  | 'review'
  | 'approved'
  | 'rejected'

export type TenantTipe = 'internal' | 'eksternal'
export type TenantTier = 'starter' | 'growth' | 'enterprise'
export type TenantStatusPKP = 'pkp' | 'non_pkp'
export type TenantBentukBadan = 'pt' | 'cv' | 'perorangan_umkm' | 'yayasan' | 'koperasi'
export type TenantContractStatus = 'draft' | 'aktif' | 'kedaluwarsa' | 'dihentikan_awal' | 'diperbarui'

export interface BuatTenantPayload {
  nama_brand:  string
  nama_legal:  string
  slug:        string
  tipe:        TenantTipe
  tier:        TenantTier
  npwp:        string
  // PIC awal — MASIH PAKAI NAMA LAMA (SEBELUM FIX K-18)
  pic_name:    string
  pic_email:   string
  pic_wa:      string
}

// (sisa interface Tenant, TenantListItem, dll — tidak berubah di fix ini)
