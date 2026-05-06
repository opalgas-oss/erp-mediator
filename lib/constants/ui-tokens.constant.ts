// lib/constants/ui-tokens.constant.ts
// Sentralisasi semua token UI — typography, warna, spacing, badge.
// SATU sumber kebenaran untuk semua class Tailwind yang dipakai berulang.
//
// Dibuat: Sesi #100 — Sentralisasi UI
//
// CARA PAKAI:
//   import { NAV_CLS, TYPOGRAPHY, BADGE_COLORS } from '@/lib/constants/ui-tokens.constant'
//
// UBAH WARNA / FONT SELURUH APP:
//   Cukup ubah di file ini → semua komponen ikut berubah otomatis.

// ─── Navigasi Sidebar ─────────────────────────────────────────────────────────

export const NAV_CLS = {
  /** Container nav element di sidebar — scroll otomatis vertikal, potong horizontal */
  nav: 'flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col gap-0.5 md:px-0 md:items-center lg:px-2 lg:items-stretch',

  /** Parent button (grup/section) — base class semua breakpoint */
  parentBase:
    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ' +
    'transition-colors md:justify-center md:px-0 md:w-[36px] md:h-[36px] ' +
    'lg:justify-start lg:px-3 lg:w-full lg:h-auto',

  /** Parent — tidak aktif */
  parentInactive: 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',

  /** Parent — aktif (halaman saat ini ada di dalam grup ini) */
  parentActive: 'bg-blue-50 text-blue-700',

  /** Sub-menu item — base class */
  subBase: 'block py-1.5 pl-9 pr-3 text-xs rounded-md my-px transition-colors whitespace-nowrap',

  /** Sub-menu — aktif */
  subActive: 'bg-blue-50 text-blue-700 font-medium',

  /** Sub-menu — tidak aktif */
  subInactive: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',

  /** Chevron icon — wrapper class */
  chevron: 'ml-auto shrink-0 transition-transform duration-200 md:hidden lg:block',

  /** Chevron saat grup terbuka */
  chevronOpen: 'rotate-180',
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  /** Judul halaman di header — responsive */
  pageTitle:   'text-base sm:text-xl font-bold text-slate-900 truncate',

  /** Deskripsi halaman di header */
  pageDesc:    'text-xs text-slate-400 truncate hidden sm:inline',

  /** Separator antara judul dan deskripsi */
  pageSep:     'text-slate-300 shrink-0 select-none hidden sm:inline',

  /** Judul kartu konfigurasi */
  cardTitle:   'text-sm font-semibold text-slate-900',

  /** Header kolom tabel */
  tableHead:   'text-xs font-semibold text-slate-600',

  /** Isi sel tabel */
  tableCell:   'text-xs text-slate-600',

  /** Label kecil / caption */
  caption:     'text-xs text-slate-400',

  /** Teks error */
  error:       'text-xs text-red-600',
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

// ─── Badge Health Status Provider ──────────────────────────────────────────────────
// Dibuat: Sesi #107 — M3 Credential Management

/** Warna badge berdasarkan health_status provider_instances */
export const BADGE_HEALTH: Record<string, string> = {
  sehat:       'bg-green-100 text-green-700 border-green-200',
  peringatan:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  gagal:       'bg-red-100 text-red-700 border-red-200',
  belum_dites: 'bg-slate-100 text-slate-500 border-slate-200',
  _default:    'bg-slate-100 text-slate-500 border-slate-200',
}

/** Label tampil untuk health_status — versi lengkap dengan keterangan */
export const HEALTH_LABEL: Record<string, string> = {
  sehat:       'Sehat (server & auth OK)',
  peringatan:  'Peringatan (server OK, auth gagal)',
  gagal:       'Gagal (server tidak bisa dijangkau)',
  belum_dites: 'Belum Dites',
}

/**
 * Resolve warna badge health status.
 */
export function resolveHealthColor(status: string): string {
  return BADGE_HEALTH[status] ?? BADGE_HEALTH._default
}

/**
 * Resolve label health status.
 */
export function resolveHealthLabel(status: string): string {
  return HEALTH_LABEL[status] ?? status
}
