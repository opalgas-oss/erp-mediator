// lib/types/tenant.types.ts
// Tipe data untuk M6 Tenant Management — entitas Tenant
// Dipakai oleh: tenant.repository.ts, tenant.service.ts, API routes M6, UI halaman Tenant
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.2

// ─── Literal Types ────────────────────────────────────────────────────────────

export type TenantLifecycleStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'terminated'

export type TenantTipe = 'internal' | 'eksternal'

export type TenantTier = 'starter' | 'growth' | 'enterprise'

export type TenantStatusPKP = 'pkp' | 'non_pkp'

export type TenantBentukBadan =
  | 'pt'
  | 'cv'
  | 'perorangan_umkm'
  | 'yayasan'
  | 'koperasi'

export type TenantContractStatus =
  | 'draft'
  | 'aktif'
  | 'kedaluwarsa'
  | 'dihentikan_awal'
  | 'diperbarui'

// ─── Entitas Utama: Tenant (full row DB) ─────────────────────────────────────

export interface Tenant {
  id:                    string
  nama_brand:            string
  nama_legal:            string | null
  slug:                  string | null        // kode tenant (citext, unique)
  tenant_display_id:     string | null        // format TEN-YYYY-NNNN
  status:                TenantLifecycleStatus
  tipe:                  TenantTipe | null
  tier:                  TenantTier
  timezone:              string
  bahasa:                string

  // Legalitas Indonesia
  npwp:                  string | null
  nib:                   string | null
  status_pkp:            TenantStatusPKP | null
  bentuk_badan_usaha:    TenantBentukBadan | null
  kbli_utama:            string | null
  kbli_sekunder:         string | null

  // Kontak & Domisili
  alamat:                string | null
  provinsi:              string | null
  kota:                  string | null
  kecamatan:             string | null
  kode_pos:              string | null
  email_resmi:           string | null
  nomor_wa_bisnis:       string | null

  // Klasifikasi Internal
  refund_auto_approve:   boolean
  region_coverage:       string | null
  tags:                  string[] | null
  catatan_internal:      string | null

  // Branding
  warna_utama:           string | null
  warna_aksen:           string | null
  logo_light_url:        string | null
  logo_dark_url:         string | null
  logo_url:              string | null        // legacy — backward compat

  // PIC Aktif (denormalized)
  current_pic_user_id:   string | null
  pic_name:              string | null
  pic_email:             string | null
  pic_wa:                string | null

  // Kontrak
  contract_number:           string | null
  contract_status:           TenantContractStatus | null
  contract_start_date:       string | null
  contract_end_date:         string | null
  contract_file_url:         string | null
  contract_signed:           boolean
  contract_signed_at:        string | null
  auto_renewal:              boolean
  renewal_notice_days:       number
  early_termination_fee:     string | null    // NUMERIC dari DB → string

  // Audit
  created_at:            string
  created_by:            string | null
  updated_at:            string
  updated_by:            string | null
  deleted_at:            string | null        // NULL = aktif (soft delete)
  deleted_by:            string | null
}

// ─── Tenant List Item (ringkasan untuk halaman List Tenants) ──────────────────

export interface TenantListItem {
  id:                string
  nama_brand:        string
  nama_legal:        string | null
  slug:              string | null
  tenant_display_id: string | null
  status:            TenantLifecycleStatus
  tipe:              TenantTipe | null
  tier:              TenantTier
  pic_name:          string | null
  created_at:        string
  // Joins
  active_categories: number              // count dari tenant_category_assignments
  active_users:      number              // count dari user_memberships (M8)
}

// ─── Tenant Detail Header (data untuk header persisten 6 tab) ─────────────────

export interface TenantDetailHeader {
  id:                string
  nama_brand:        string
  nama_legal:        string | null
  slug:              string | null
  tenant_display_id: string | null
  status:            TenantLifecycleStatus
  tipe:              TenantTipe | null
  tier:              TenantTier
  status_pkp:        TenantStatusPKP | null
  created_at:        string
  // Quick stats
  active_categories: number
  active_users:      number
  contract_end_date: string | null
  auto_renewal:      boolean
}

// ─── Payload: Buat Tenant (Dialog Tambah Tenant — Opsi B staged minimal) ─────

export interface BuatTenantPayload {
  nama_brand:  string
  nama_legal:  string
  slug:        string
  tipe:        TenantTipe
  npwp:        string
  // PIC awal
  pic_name:    string
  pic_email:   string
  pic_wa:      string
}

// ─── Payload: Update Tab Info Umum ────────────────────────────────────────────

export interface UpdateTenantInfoPayload {
  nama_brand?:           string
  nama_legal?:           string
  npwp?:                 string
  nib?:                  string
  status_pkp?:           TenantStatusPKP
  bentuk_badan_usaha?:   TenantBentukBadan
  kbli_utama?:           string
  kbli_sekunder?:        string
  alamat?:               string
  provinsi?:             string
  kota?:                 string
  kecamatan?:            string
  kode_pos?:             string
  email_resmi?:          string
  nomor_wa_bisnis?:      string
  tipe?:                 TenantTipe
  tier?:                 TenantTier
  refund_auto_approve?:  boolean
  region_coverage?:      string
  tags?:                 string[]
  timezone?:             string
  bahasa?:               string
  catatan_internal?:     string
  warna_utama?:          string
  warna_aksen?:          string
  logo_light_url?:       string
  logo_dark_url?:        string
}

// ─── Payload: Update Status Lifecycle ─────────────────────────────────────────

export interface UpdateTenantStatusPayload {
  status:  TenantLifecycleStatus
  alasan:  string
  // Diperlukan saat konfirmasi 2-step — nama tenant diketik ulang oleh user
  konfirmasi_nama: string
}

// ─── Filter: List Tenants ─────────────────────────────────────────────────────

export interface TenantListFilter {
  status?:  TenantLifecycleStatus | 'all'
  tipe?:    TenantTipe
  tier?:    TenantTier
  search?:  string               // cari nama_brand, nama_legal, slug
  page?:    number               // default 1
  limit?:   number               // default 20
}

// ─── Response: API List Tenants ───────────────────────────────────────────────

export interface TenantListResponse {
  data:    TenantListItem[]
  total:   number
  page:    number
  limit:   number
}
