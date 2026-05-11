// lib/constants/dropdown-category.constant.ts
// Konstanta kategori dan mode tenant override untuk M4 Master Dropdown.
// Sumber kebenaran tunggal — dipakai di UI, API route, dan seed script.
//
// DROPDOWN_CATEGORY    : 8 kategori grup dropdown platform-wide
// TENANT_OVERRIDE_MODE : 3 mode kontrol tenant override per grup
//
// Dibuat: Sesi #115 — M4 Master Dropdown FASE 3 Step 3.7

import type { DropdownCategory, TenantOverrideMode } from '@/lib/types/master-dropdown.types'

// ─── Kategori Dropdown ────────────────────────────────────────────────────────

/** 8 kategori grup dropdown. Dipakai sebagai filter tab di halaman Master Dropdown SA. */
export const DROPDOWN_CATEGORY = {
  CONFIG_UNIT:       'config_unit',
  STATUS_LIFECYCLE:  'status_lifecycle',
  COMMUNICATION:     'communication',
  GEOGRAPHIC:        'geographic',
  BUSINESS_CATEGORY: 'business_category',
  PAYMENT_COMMERCE:  'payment_commerce',
  UI_DISPLAY:        'ui_display',
  SCHEDULE_TIME:     'schedule_time',
} as const satisfies Record<string, DropdownCategory>

/** Label bahasa Indonesia untuk setiap kategori — dipakai di tab filter UI dan form. */
export const DROPDOWN_CATEGORY_LABELS: Record<DropdownCategory, string> = {
  config_unit:       'Konfigurasi & Satuan',
  status_lifecycle:  'Status & Lifecycle',
  communication:     'Komunikasi',
  geographic:        'Geografis',
  business_category: 'Kategori Bisnis',
  payment_commerce:  'Pembayaran & Komisi',
  ui_display:        'UI & Tampilan',
  schedule_time:     'Jadwal & Waktu',
}

// ─── Tenant Override Mode ─────────────────────────────────────────────────────

/** 3 mode kontrol sejauh mana tenant boleh override opsi grup. */
export const TENANT_OVERRIDE_MODE = {
  NONE:     'none',
  ADD_ONLY: 'add_only',
  FULL:     'full',
} as const satisfies Record<string, TenantOverrideMode>

/** Label bahasa Indonesia untuk setiap override mode — dipakai di form SuperAdmin. */
export const TENANT_OVERRIDE_MODE_LABELS: Record<TenantOverrideMode, string> = {
  none:     'Tidak',
  add_only: 'Tambah Saja',
  full:     'Penuh',
}
