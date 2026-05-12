// lib/constants/category.constant.ts
// Konstanta untuk M6 — Category & Assignment
// Dipakai oleh: category.service.ts, tenant-category-assignment.service.ts, UI
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.5

// ─── Level Kategori ───────────────────────────────────────────────────────────

export const CATEGORY_LEVEL = {
  ROOT: 1,
  SUB:  2,
} as const

export const CATEGORY_LEVEL_LABELS: Record<number, string> = {
  1: 'Root',
  2: 'Sub-kategori',
}

// ─── Status Assignment ────────────────────────────────────────────────────────

export const ASSIGNMENT_STATUS = {
  ACTIVE:          'active',
  SUSPENDED:       'suspended',
  PENDING_HANDOVER:'pending_handover',
} as const

export type AssignmentStatusValue =
  typeof ASSIGNMENT_STATUS[keyof typeof ASSIGNMENT_STATUS]

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatusValue, string> = {
  active:          'Aktif',
  suspended:       'Ditangguhkan',
  pending_handover:'Serah terima',
}

export const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatusValue, {
  bg: string; text: string; border: string
}> = {
  active:          { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' },
  suspended:       { bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27' },
  pending_handover:{ bg: '#FAEEDA', text: '#854F0B', border: '#EF9F27' },
}

// ─── Status Tree Node (Dialog Assign) ────────────────────────────────────────

export const TREE_NODE_STATUS = {
  DIPEGANG_SENDIRI:   'dipegang_tenant_ini',
  DIPEGANG_LAIN:      'dipegang_tenant_lain',
  TERSEDIA:           'tersedia',
} as const

export const TREE_NODE_STATUS_LABELS: Record<string, string> = {
  dipegang_tenant_ini:  'Dipegang',
  dipegang_tenant_lain: 'Tenant lain',
  tersedia:             'Tersedia',
}

export const TREE_NODE_STATUS_COLORS: Record<string, {
  bg: string; text: string; border: string
}> = {
  dipegang_tenant_ini:  { bg: '#EAF3DE', text: '#3B6D11', border: '#97C459' },
  dipegang_tenant_lain: { bg: '#FCEBEB', text: '#A32D2D', border: '#F09595' },
  tersedia:             { bg: '#F1EFE8', text: '#5F5E5A', border: '#B4B2A9' },
}

// ─── Default Icons untuk Kategori Root ────────────────────────────────────────

/** Icon-icon Tabler yang tersedia di icon picker kategori */
export const CATEGORY_DEFAULT_ICONS = [
  'ti-car',
  'ti-tool',
  'ti-home',
  'ti-brush',
  'ti-device-laptop',
  'ti-device-mobile',
  'ti-scissors',
  'ti-cooking-pot',
  'ti-heart',
  'ti-school',
  'ti-building',
  'ti-shirt',
  'ti-plant',
  'ti-paw',
  'ti-music',
] as const

/** Background colors untuk ikon kategori root */
export const CATEGORY_ICON_BG_OPTIONS = [
  '#E6F1FB',   // biru muda
  '#EAF3DE',   // hijau muda
  '#FAEEDA',   // amber muda
  '#FCEBEB',   // merah muda
  '#EEEDFE',   // ungu muda
  '#F1EFE8',   // abu muda
  '#FAF0E6',   // krem
] as const

// ─── Konstanta Operasional Assignment ────────────────────────────────────────

/** Batas tampil nama tenant di kolom List Categories (tooltip sisanya) */
export const MAX_TENANT_NAMES_DISPLAY = 3

/** SLA default dalam menit jika tidak diset */
export const DEFAULT_SLA_MINUTES: Record<string, number> = {
  'otomotif':   30,
  'kuliner':     5,
  'kecantikan': 15,
  'konstruksi': 60,
}
