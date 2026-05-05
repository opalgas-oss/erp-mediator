// lib/constants/page-meta.constant.ts
// Sentralisasi mapping pathname → judul halaman + deskripsi.
// SATU sumber kebenaran untuk semua page title yang tampil di DashboardHeader.
//
// Dibuat: Sesi #100 — Sentralisasi UI
//
// CARA PAKAI:
//   import { resolvePageMeta } from '@/lib/constants/page-meta.constant'
//   const { titleKey, descKey } = resolvePageMeta(pathname)
//
// TAMBAH HALAMAN BARU:
//   Tambah entry di PAGE_META → otomatis tampil di header tanpa ubah DashboardHeader.tsx

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface PageMeta {
  /** Key di message_library untuk judul halaman */
  titleKey: string
  /** Key di message_library untuk deskripsi halaman (opsional) */
  descKey:  string
}

// ─── Mapping pathname → meta ───────────────────────────────────────────────────
// Key = pathname eksak (tanpa trailing slash).
// Urutan tidak berpengaruh — lookup by exact key.

const PAGE_META: Record<string, PageMeta> = {
  // ── Konfigurasi ──
  '/dashboard/superadmin/settings/security-login':    { titleKey: 'page_title_security_login',    descKey: 'page_desc_security_login'    },
  '/dashboard/superadmin/settings/multi-role-policy': { titleKey: 'page_title_multi_role_policy', descKey: 'page_desc_multi_role_policy' },

  // ── Konten ──
  '/dashboard/superadmin/messages':                   { titleKey: 'page_title_messages',           descKey: 'page_desc_messages'          },

  // ── Default ──
  '/dashboard/superadmin':                            { titleKey: 'page_title_dashboard',          descKey: ''                            },
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

const FALLBACK: PageMeta = { titleKey: 'page_title_dashboard', descKey: '' }

/**
 * Resolve metadata halaman dari pathname.
 * Coba exact match dulu, lalu prefix match (untuk dynamic routes).
 * Fallback ke page_title_dashboard jika tidak ditemukan.
 */
export function resolvePageMeta(pathname: string): PageMeta {
  // Normalize — hapus trailing slash
  const normalized = pathname.replace(/\/$/, '')

  // 1. Exact match
  if (PAGE_META[normalized]) return PAGE_META[normalized]

  // 2. Prefix match — untuk dynamic routes seperti /settings/[slug]
  //    Ambil entry yang paling panjang prefixnya (most specific)
  let best: PageMeta | null = null
  let bestLen = 0
  for (const [key, meta] of Object.entries(PAGE_META)) {
    if (normalized.startsWith(key) && key.length > bestLen) {
      best    = meta
      bestLen = key.length
    }
  }
  if (best) return best

  return FALLBACK
}
