// lib/constants/tenant.constant.ts
// Konstanta untuk M6 Tenant Management — status, tipe, tier, kontrak
// Dipakai oleh: tenant.service.ts, API routes, UI komponen
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.5

// ─── Status Lifecycle Tenant ──────────────────────────────────────────────────

export const TENANT_STATUS = {
  PENDING:    'pending',
  ACTIVE:     'active',
  SUSPENDED:  'suspended',
  EXPIRED:    'expired',
  TERMINATED: 'terminated',
} as const

export type TenantStatusValue = typeof TENANT_STATUS[keyof typeof TENANT_STATUS]

/** Label UI Bahasa Indonesia per status */
export const TENANT_STATUS_LABELS: Record<TenantStatusValue, string> = {
  pending:    'Menunggu aktivasi',
  active:     'Aktif',
  suspended:  'Dinonaktifkan sementara',
  expired:    'Kedaluwarsa',
  terminated: 'Diakhiri',
}

/** Warna badge per status (sesuai DESIGN_TOKEN_M6) */
export const TENANT_STATUS_COLORS: Record<TenantStatusValue, {
  bg: string; text: string; border: string
}> = {
  pending:    { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27' },
  active:     { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' },
  suspended:  { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27' },
  expired:    { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9' },
  terminated: { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
}

// ─── Tipe Tenant ──────────────────────────────────────────────────────────────

export const TENANT_TIPE = {
  INTERNAL:  'internal',
  EKSTERNAL: 'eksternal',
} as const

export type TenantTipeValue = typeof TENANT_TIPE[keyof typeof TENANT_TIPE]

export const TENANT_TIPE_LABELS: Record<TenantTipeValue, string> = {
  internal:  'Internal',
  eksternal: 'Eksternal',
}

export const TENANT_TIPE_COLORS: Record<TenantTipeValue, {
  bg: string; text: string; border: string
}> = {
  internal:  { bg: '#EEEDFE', text: '#534AB7', border: '#AFA9EC' },
  eksternal: { bg: '#FAECE7', text: '#993C1D', border: '#F0997B' },
}

// ─── Tier / Paket ─────────────────────────────────────────────────────────────

export const TENANT_TIER = {
  STARTER:    'starter',
  GROWTH:     'growth',
  ENTERPRISE: 'enterprise',
} as const

export type TenantTierValue = typeof TENANT_TIER[keyof typeof TENANT_TIER]

export const TENANT_TIER_LABELS: Record<TenantTierValue, string> = {
  starter:    'Starter',
  growth:     'Growth',
  enterprise: 'Enterprise',
}

/** Kuota user per tier */
export const TENANT_TIER_USER_LIMIT: Record<TenantTierValue, number | null> = {
  starter:    5,
  growth:     15,
  enterprise: null,   // null = unlimited
}

// ─── Status PKP ───────────────────────────────────────────────────────────────

export const STATUS_PKP = {
  PKP:     'pkp',
  NON_PKP: 'non_pkp',
} as const

export type StatusPKPValue = typeof STATUS_PKP[keyof typeof STATUS_PKP]

export const STATUS_PKP_LABELS: Record<StatusPKPValue, string> = {
  pkp:     'PKP',
  non_pkp: 'Non-PKP',
}

// ─── Bentuk Badan Usaha ───────────────────────────────────────────────────────

export const BENTUK_BADAN_USAHA = {
  PT:              'pt',
  CV:              'cv',
  PERORANGAN_UMKM: 'perorangan_umkm',
  YAYASAN:         'yayasan',
  KOPERASI:        'koperasi',
} as const

export const BENTUK_BADAN_USAHA_LABELS: Record<string, string> = {
  pt:              'PT (Perseroan Terbatas)',
  cv:              'CV (Commanditaire Vennootschap)',
  perorangan_umkm: 'Perorangan / UMKM',
  yayasan:         'Yayasan',
  koperasi:        'Koperasi',
}

// ─── Status Kontrak ───────────────────────────────────────────────────────────

export const CONTRACT_STATUS = {
  DRAFT:          'draft',
  AKTIF:          'aktif',
  KEDALUWARSA:    'kedaluwarsa',
  DIHENTIKAN:     'dihentikan_awal',
  DIPERBARUI:     'diperbarui',
} as const

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft:           'Draft',
  aktif:           'Aktif',
  kedaluwarsa:     'Kedaluwarsa',
  dihentikan_awal: 'Dihentikan lebih awal',
  diperbarui:      'Diperbarui',
}

// ─── Konstanta Operasional ────────────────────────────────────────────────────

/** Hari minimum sebelum notifikasi perpanjangan kontrak */
export const CONTRACT_RENEWAL_WARNING_DAYS = 30

/** Default hari pemberitahuan renewal */
export const CONTRACT_DEFAULT_NOTICE_DAYS = 90

/** Format ID tenant */
export const TENANT_ID_PREFIX = 'TEN'

/** Tarif PPN standar marketplace Indonesia 2025 */
export const PPN_RATE = 0.11

// ─── Alias UI (shorthand untuk dipakai di komponen) ──────────────────────────

/** Alias: TENANT_STATUS_LABELS — dipakai di komponen UI */
export const TENANT_LIFECYCLE_LABEL = TENANT_STATUS_LABELS

/** Alias: CONTRACT_STATUS_LABELS — dipakai di komponen UI */
export const TENANT_CONTRACT_STATUS_LABEL = CONTRACT_STATUS_LABELS

/** Alias: TENANT_TIER_LABELS — dipakai di komponen UI */
export const TENANT_TIER_LABEL = TENANT_TIER_LABELS

// ─── Konstanta PIC (Person In Charge) ──────────────────────────────────────────────────

/** Opsi relasi PIC ke perusahaan — untuk dropdown form tambah/ganti PIC */
export const PIC_RELASI_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'owner',            label: 'Owner / Pemilik' },
  { value: 'direktur',         label: 'Direktur' },
  { value: 'karyawan',         label: 'Karyawan' },
  { value: 'konsultan',        label: 'Konsultan' },
  { value: 'keluarga_pemilik', label: 'Keluarga Pemilik' },
]

/** Opsi alasan pergantian PIC — untuk dropdown Step 2 wizard ganti PIC utama */
export const PIC_ALASAN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'resign',            label: 'Resign' },
  { value: 'mutasi',            label: 'Mutasi' },
  { value: 'promosi',           label: 'Promosi' },
  { value: 'restrukturisasi',   label: 'Restrukturisasi' },
  { value: 'kontrak_berakhir',  label: 'Kontrak berakhir' },
  { value: 'lainnya',           label: 'Lainnya' },
]
