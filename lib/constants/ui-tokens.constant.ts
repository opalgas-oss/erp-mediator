// lib/constants/ui-tokens.constant.ts
// Sentralisasi semua token UI — typography, warna, spacing, badge.
// SATU sumber kebenaran untuk semua class Tailwind yang dipakai berulang.
//
// Dibuat: Sesi #100 — Sentralisasi UI
// Update: Sesi #248 — CSS variables semantik dipindah ke globals.css sebagai SSOT
// Update: CASE SESI-14 (8 Juni 2026) — Font Inter + Sidebar gelap + font size standar baru
//   → Keputusan Philips: Inter, sidebar #1a1a1a, font sidebar light (rgba putih)
//   → Referensi standar lengkap: STANDAR_UI_UX_MOCKUP_RULES.md (04_Mockup_UI/)
//
// CARA PAKAI:
//   import { NAV_CLS, TYPOGRAPHY, BADGE_COLORS } from '@/lib/constants/ui-tokens.constant'
//
// UBAH WARNA / FONT SELURUH APP:
//   Cukup ubah di file ini → semua komponen ikut berubah otomatis.

// ─── Navigasi Sidebar ─────────────────────────────────────────────────────────
// Sidebar gelap (#1a1a1a) — font light/terang agar mudah dibaca semua umur
// Referensi: STANDAR_UI_UX_MOCKUP_RULES.md BAB 4

export const NAV_CLS = {
  /** Container nav element di sidebar */
  nav: 'flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col gap-0.5 md:px-0 md:items-center lg:px-2 lg:items-stretch',

  /** Section label (DASHBOARD, KONFIGURASI, dll) */
  sectionLabel: 'px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/45',

  /** Parent button (grup/section) — base class semua breakpoint */
  parentBase:
    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium ' +
    'transition-colors md:justify-center md:px-0 md:w-[36px] md:h-[36px] ' +
    'lg:justify-start lg:px-3 lg:w-full lg:h-auto',

  /** Parent — tidak aktif: rgba putih 85% agar terbaca jelas */
  parentInactive: 'text-white/85 hover:bg-white/[0.07] hover:text-white/95',

  /** Parent — aktif */
  parentActive: 'bg-white/[0.12] text-white',

  /** Sub-menu item — base class */
  subBase: 'block py-1.5 pl-9 pr-3 text-[12px] rounded-md my-px transition-colors whitespace-nowrap',

  /** Sub-menu — aktif */
  subActive: 'bg-white/[0.12] text-white font-medium',

  /** Sub-menu — tidak aktif: rgba putih 65% */
  subInactive: 'text-white/65 hover:bg-white/[0.07] hover:text-white/85',

  /** Chevron icon — wrapper class */
  chevron: 'ml-auto shrink-0 transition-transform duration-200 md:hidden lg:block',

  /** Chevron saat grup terbuka */
  chevronOpen: 'rotate-180',
} as const

// ─── Typography ───────────────────────────────────────────────────────────────
// Font: Inter — keputusan Philips CASE SESI-14
// Referensi lengkap: STANDAR_UI_UX_MOCKUP_RULES.md BAB 1

export const TYPOGRAPHY = {
  /** Judul halaman di header bar — 20px semibold */
  pageTitle:   'text-[20px] font-semibold text-[#1a1a1a] truncate',

  /** Deskripsi halaman di header bar — 12px */
  pageDesc:    'text-[12px] text-[#6b7280] truncate hidden sm:inline',

  /** Separator antara judul dan deskripsi */
  pageSep:     'text-[#d1d5db] shrink-0 select-none hidden sm:inline',

  /** Heading level 2 — 16px semibold */
  h2:          'text-[16px] font-semibold text-[#1a1a1a]',

  /** Card title — 14px semibold */
  cardTitle:   'text-[14px] font-semibold text-[#1a1a1a]',

  /** Teks muted / sekunder */
  muted:       'text-[13px] text-[#6b7280]',

  /** Label form — 12px medium */
  label:       'text-[12px] font-medium text-[#374151]',

  /** Header kolom tabel — 12px medium */
  tableHead:   'text-[12px] font-medium text-[#6b7280]',

  /** Isi sel tabel utama — 13px */
  tableCell:   'text-[13px] text-[#1a1a1a]',

  /** Sub-teks sel tabel (di bawah nama) — 11px */
  tableCellSub: 'text-[11px] text-[#6b7280]',

  /** Caption / keterangan kecil — 11px */
  caption:     'text-[11px] text-[#6b7280]',

  /** Teks error — 11px */
  error:       'text-[11px] text-[#A32D2D]',
} as const

// ─── Scroll — DashboardShell ──────────────────────────────────────────────────

export const SCROLL_CLS = {
  /** Main content area — scroll vertikal + horizontal otomatis */
  main: 'flex-1 overflow-y-auto overflow-x-auto flex flex-col',

  /** Sidebar nav — scroll vertikal otomatis, potong horizontal */
  sidebarNav: NAV_CLS.nav,
} as const

// ─── Badge Warna ──────────────────────────────────────────────────────────────

/** Warna badge berdasarkan kategori message_library */
export const BADGE_KATEGORI: Record<string, string> = {
  login:   'bg-blue-100 text-blue-800',
  header:  'bg-green-100 text-green-800',
  page:    'bg-orange-100 text-orange-800',
  otp:     'bg-yellow-100 text-yellow-800',
  sidebar: 'bg-purple-100 text-purple-800',
  wa:      'bg-green-100 text-green-800',
  notif:   'bg-green-100 text-green-800',
  vendor:  'bg-orange-100 text-orange-800',
  _default:'bg-slate-100 text-slate-700',
}

/** Warna badge berdasarkan channel (ui / wa / email / sms) */
export const BADGE_CHANNEL: Record<string, string> = {
  ui:      'bg-blue-100 text-blue-700',
  wa:      'bg-green-100 text-green-700',
  email:   'bg-purple-100 text-purple-700',
  sms:     'bg-orange-100 text-orange-700',
  _default:'bg-slate-100 text-slate-600',
}

/**
 * Resolve warna badge kategori.
 * Cocokkan berdasarkan substring dari nama kategori.
 */
export function resolveKategoriColor(kategori: string): string {
  const k = kategori.toLowerCase()
  for (const [pattern, cls] of Object.entries(BADGE_KATEGORI)) {
    if (pattern === '_default') continue
    if (k.includes(pattern)) return cls
  }
  return BADGE_KATEGORI._default
}

/**
 * Resolve warna badge channel.
 */
export function resolveChannelColor(channel: string): string {
  return BADGE_CHANNEL[channel.toLowerCase()] ?? BADGE_CHANNEL._default
}

// ─── Badge Lifecycle Status (USAGE_TRACKING) ──────────────────────────────────
// Dibuat: Sesi #121 — PL-S12 UsageTrackingPanel

/** Warna badge berdasarkan lifecycle_status registry_dependencies */
export const BADGE_LIFECYCLE: Record<string, string> = {
  RENCANA:       'bg-blue-100 text-blue-700 border-blue-200',
  DIBANGUN:      'bg-amber-100 text-amber-700 border-amber-200',
  AKTIF:         'bg-green-100 text-green-700 border-green-200',
  TIDAK_DIPAKAI: 'bg-slate-100 text-slate-500 border-slate-200',
  _default:      'bg-slate-100 text-slate-500 border-slate-200',
}

/** Label tampil untuk lifecycle_status — bahasa Indonesia untuk Philips */
export const LIFECYCLE_LABEL: Record<string, string> = {
  RENCANA:       'Rencana',
  DIBANGUN:      'Dibangun',
  AKTIF:         'Aktif',
  TIDAK_DIPAKAI: 'Tidak Dipakai',
}

export function resolveLifecycleColor(status: string): string {
  return BADGE_LIFECYCLE[status] ?? BADGE_LIFECYCLE._default
}

export function resolveLifecycleLabel(status: string): string {
  return LIFECYCLE_LABEL[status] ?? status
}

/** Style panel safety_verdict untuk komponen UsageTrackingPanel */
export const VERDICT_STYLE: Record<string, {
  container: string
  icon:      string
  title:     string
  label:     string
}> = {
  AMAN: {
    container: 'bg-green-50 border-green-200',
    icon:      'text-green-600',
    title:     'text-green-800',
    label:     'Aman dihapus',
  },
  TIDAK_BISA: {
    container: 'bg-amber-50 border-amber-200',
    icon:      'text-amber-600',
    title:     'text-amber-800',
    label:     'Tidak aman dihapus saat ini',
  },
  TIDAK_AMAN: {
    container: 'bg-red-50 border-red-200',
    icon:      'text-red-600',
    title:     'text-red-800',
    label:     'Tidak bisa dihapus',
  },
  _default: {
    container: 'bg-slate-50 border-slate-200',
    icon:      'text-slate-400',
    title:     'text-slate-600',
    label:     'Memuat...',
  },
}

// ─── Badge Health Status Provider ─────────────────────────────────────────────

export const BADGE_HEALTH: Record<string, string> = {
  sehat:                'bg-green-100 text-green-700 border-green-200',
  peringatan:           'bg-yellow-100 text-yellow-700 border-yellow-200',
  gagal:                'bg-red-100 text-red-700 border-red-200',
  belum_dites:          'bg-slate-100 text-slate-500 border-slate-200',
  dikonfigurasi_manual: 'bg-blue-50 text-blue-600 border-blue-200',
  _default:             'bg-slate-100 text-slate-500 border-slate-200',
}

export const HEALTH_LABEL: Record<string, string> = {
  sehat:                'Sehat (server & auth OK)',
  peringatan:           'Peringatan (server OK, auth gagal)',
  gagal:                'Gagal (server tidak bisa dijangkau)',
  belum_dites:          'Belum Dites',
  dikonfigurasi_manual: 'Dikonfigurasi Manual (tanpa test)',
}

export function resolveHealthColor(status: string): string {
  return BADGE_HEALTH[status] ?? BADGE_HEALTH._default
}

export function resolveHealthLabel(status: string): string {
  return HEALTH_LABEL[status] ?? status
}

// ─── Use Case Options (API Provider) ───────────────────────────────────────────────────────────────
// Dipakai: DialogKonfigurasi.body.tsx (checkbox pilih) + ProviderTableRow.tsx (chip tampil)
// S#288 — FASE 2 use_case

export const USE_CASE_OPTIONS: Array<{ value: string; label: string; color: string; bg: string; border: string }> = [
  { value: 'runtime',      label: 'Runtime',      color: '#185FA5', bg: '#E6F1FB', border: '#85B7EB' },
  { value: 'monitoring',   label: 'Monitoring',   color: '#5B3BAC', bg: '#F0EAFC', border: '#B59EE0' },
  { value: 'notification', label: 'Notification', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
  { value: 'payment',      label: 'Payment',      color: '#3B6D11', bg: '#EAF3DE', border: '#97C459' },
  { value: 'storage',      label: 'Storage',      color: '#6b7280', bg: '#F3F4F6', border: '#D1D5DB' },
  { value: 'cdn',          label: 'CDN',          color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
  { value: 'search',       label: 'Search',       color: '#0E6E6E', bg: '#E0F5F5', border: '#7BCFCF' },
]

/** Resolve style chip use_case dari value string. Fallback ke abu-abu jika tidak dikenal. */
export function resolveUseCaseStyle(value: string): { label: string; color: string; bg: string; border: string } {
  return USE_CASE_OPTIONS.find(o => o.value === value)
    ?? { label: value, color: '#6b7280', bg: '#F3F4F6', border: '#D1D5DB' }
}
