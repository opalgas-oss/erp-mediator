// lib/types/dashboard-menu.types.ts
// Tipe data untuk katalog menu data-driven (tabel dashboard_menus).
// Dibuat: Sesi #254 — FASE 1 HUTANG-NAV-DATADRIVEN (K-40).
//
// Tabel: dashboard_menus (self-referencing, lintas-role).
// Acuan: Blueprint/AT_AUTH/SPEC_TABEL_MENU_KATALOG_v1.md
//        Shared_Database/Schema_DashboardMenus.md

// ─── Entitas: baris mentah dashboard_menus (flat, dari Supabase) ──────────────

export interface DashboardMenuRow {
  id:           string
  parent_id:    string | null
  role_scope:   string
  menu_key:     string
  label_key:    string
  route_path:   string | null
  icon_key:     string | null
  sort_order:   number
  is_pj_only:   boolean
  feature_flag: string | null
  is_active:    boolean
}

// ─── Struktur siap-render: SubMenu (item daun di dalam grup) ──────────────────

export interface MenuItem {
  menuKey:      string
  labelKey:     string
  routePath:    string | null
  featureFlag:  string | null
  isPjOnly:     boolean
}

// ─── Struktur siap-render: Grup Menu (induk + daftar item) ────────────────────

export interface MenuGroup {
  menuKey:  string
  labelKey: string
  iconKey:  string | null
  items:    MenuItem[]
}
