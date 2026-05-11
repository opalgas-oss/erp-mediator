// lib/types/master-dropdown.types.ts
// Tipe data untuk M4 Master Dropdown — central registry opsi pilihan platform-wide
// Dipakai oleh: master-dropdown.repository.ts, master-dropdown.service.ts, DropdownsClient.tsx
// Dibuat: Sesi #114 — M4 Master Dropdown FASE 3 Step 3.2

// ─── Grup ────────────────────────────────────────────────────────────────────

export interface MasterDropdownGroup {
  id:                   string
  slug:                 string
  display_name:         string
  description:          string | null
  category:             DropdownCategory
  module:               string | null
  tenant_can_override:  boolean
  tenant_override_mode: TenantOverrideMode
  is_system:            boolean
  is_active:            boolean
  sort_order:           number
  metadata:             Record<string, unknown> | null
  created_at:           string
  created_by:           string | null
  updated_at:           string
  updated_by:           string | null
  deleted_at:           string | null   // soft delete — NULL = aktif/tersedia
}

// ─── Opsi ────────────────────────────────────────────────────────────────────

export interface MasterDropdownOption {
  id:               string
  group_id:         string
  slug:             string
  label:            string
  numeric_value:    number | null
  string_value:     string | null
  json_value:       Record<string, unknown> | null
  is_default:       boolean
  is_active:        boolean
  is_system:        boolean
  tenant_id:        string | null   // NULL = platform default, terisi = tenant override
  parent_option_id: string | null   // RESERVED untuk hierarki opsi (NULL = flat di MVP)
  sort_order:       number
  metadata:         Record<string, unknown> | null
  created_at:       string
  created_by:       string | null
  updated_at:       string
  updated_by:       string | null
  deleted_at:       string | null   // soft delete — NULL = aktif/tersedia
}

// ─── Grup Dengan Opsi (response gabungan untuk RSC + UI list) ───────────────

export interface GrupDenganOpsi extends MasterDropdownGroup {
  opsi: MasterDropdownOption[]
}

// ─── Payload: Buat Grup ─────────────────────────────────────────────────────

export interface BuatGrupPayload {
  slug:                 string
  display_name:         string
  description:          string | null
  category:             DropdownCategory
  module:               string | null
  tenant_can_override:  boolean
  tenant_override_mode: TenantOverrideMode
  is_system:            boolean
  sort_order:           number
}

// ─── Payload: Ubah Grup (semua field opsional — partial update) ─────────────

export interface UbahGrupPayload {
  display_name?:         string
  description?:          string | null
  category?:             DropdownCategory
  module?:               string | null
  tenant_can_override?:  boolean
  tenant_override_mode?: TenantOverrideMode
  sort_order?:           number
}

// ─── Payload: Buat Opsi ─────────────────────────────────────────────────────

export interface BuatOpsiPayload {
  group_id:      string
  slug:          string
  label:         string
  numeric_value: number | null
  string_value:  string | null
  json_value:    Record<string, unknown> | null
  is_default:    boolean
  is_system:     boolean
  tenant_id:     string | null   // NULL = platform default, terisi = tenant override
  sort_order:    number
}

// ─── Payload: Ubah Opsi (semua field opsional) ──────────────────────────────

export interface UbahOpsiPayload {
  label?:         string
  numeric_value?: number | null
  string_value?:  string | null
  json_value?:    Record<string, unknown> | null
  sort_order?:    number
  is_active?:     boolean   // untuk reaktivasi opsi (deactivate per-grup pakai SP terpisah)
}

// ─── Literal Types ──────────────────────────────────────────────────────────

export type DropdownCategory =
  | 'config_unit'
  | 'status_lifecycle'
  | 'communication'
  | 'geographic'
  | 'business_category'
  | 'payment_commerce'
  | 'ui_display'
  | 'schedule_time'

export type TenantOverrideMode =
  | 'none'
  | 'add_only'
  | 'full'
