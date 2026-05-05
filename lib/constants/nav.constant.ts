// lib/constants/nav.constant.ts
// Sentralisasi struktur navigasi sidebar SuperAdmin.
// SATU sumber kebenaran untuk: grup menu, sub-menu, path, urutan, icon.
//
// Dibuat: Sesi #100 — Sentralisasi UI
// Updated: Sesi #100 — icon pakai ICON_NAV dari icons.constant (tidak import lucide langsung)
//
// CARA PAKAI:
//   import { SA_NAV_GROUPS, navItemToPath } from '@/lib/constants/nav.constant'
//
// TAMBAH MENU BARU:
//   1. Tambah entry di SA_NAV_GROUPS[n].items → otomatis tampil di sidebar
//   2. Tidak perlu ubah SidebarNav.tsx sama sekali
//
// GANTI ICON GRUP:
//   Ubah di icons.constant.ts → ikut berubah otomatis di sini

import { ICON_NAV }    from '@/lib/constants/icons.constant'
import type { LucideIcon } from '@/lib/constants/icons.constant'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface NavSubItem {
  /** feature_key atau route key unik — dipakai untuk path dan label lookup */
  key:      string
  /** Key di message_library untuk label menu ini */
  labelKey: string
  /** Path absolut — override auto-generate jika diisi */
  path?:    string
}

export interface NavGroup {
  /** Key unik grup ini */
  key:      string
  /** Key di message_library untuk label grup */
  labelKey: string
  /** Icon dari ICON_NAV registry — bukan import langsung dari lucide-react */
  icon:     LucideIcon
  /** Ukuran icon dalam px */
  iconSize: number
  /** Sub-menu dalam grup ini */
  items:    NavSubItem[]
}

// ─── Helper — generate path dari feature_key ──────────────────────────────────

export function navItemToPath(item: NavSubItem): string {
  if (item.path) return item.path
  return `/dashboard/superadmin/settings/${item.key.replace(/_/g, '-')}`
}

// ─── Definisi grup navigasi SuperAdmin ────────────────────────────────────────
// Urutan array = urutan tampil di sidebar.
// Urutan items dalam grup = urutan sub-menu.
// Icon diambil dari ICON_NAV — ganti icon = ubah icons.constant.ts saja.

export const SA_NAV_GROUPS: NavGroup[] = [
  {
    key:      'konfigurasi',
    labelKey: 'sidebar_menu_konfigurasi',
    icon:     ICON_NAV.konfigurasi,
    iconSize: 15,
    items: [
      { key: 'security_login',    labelKey: 'nav_menu_security_login'    },
      { key: 'multi_role_policy', labelKey: 'nav_menu_multi_role_policy' },
      { key: 'register_user',     labelKey: 'nav_menu_register_user'     },
      { key: 'register_vendor',   labelKey: 'nav_menu_register_vendor'   },
      { key: 'order_form',        labelKey: 'nav_menu_order_form'        },
      { key: 'bidding_vendor',    labelKey: 'nav_menu_bidding_vendor'    },
      { key: 'payment',           labelKey: 'nav_menu_payment'           },
      { key: 'branding',          labelKey: 'nav_menu_branding'          },
      { key: 'pesan',             labelKey: 'nav_menu_pesan'             },
      { key: 'sistem',            labelKey: 'nav_menu_sistem'            },
      { key: 'pilihan_opsi',      labelKey: 'nav_menu_pilihan_opsi'      },
    ],
  },
  {
    key:      'konten',
    labelKey: 'sidebar_menu_konten',
    icon:     ICON_NAV.konten,
    iconSize: 15,
    items: [
      {
        key:      'messages',
        labelKey: 'nav_menu_messages',
        path:     '/dashboard/superadmin/messages',
      },
    ],
  },
]

// ─── Set semua feature_key valid (untuk filter dari DB) ───────────────────────

export const SA_VALID_FEATURE_KEYS = new Set<string>(
  SA_NAV_GROUPS
    .filter(g => g.key === 'konfigurasi')
    .flatMap(g => g.items.map(i => i.key))
)
