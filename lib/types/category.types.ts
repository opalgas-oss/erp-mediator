// lib/types/category.types.ts
// Tipe data untuk M6 — entitas Kategori Jasa Platform
// Dipakai oleh: category.repository.ts, category.service.ts, API routes M6, halaman List Categories
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.2

// ─── Literal Types ────────────────────────────────────────────────────────────

export type CategoryLevel = 1 | 2   // 1 = root, 2 = sub-kategori

// ─── Entitas: Category (full row DB) ─────────────────────────────────────────

export interface Category {
  id:           string
  slug:         string                   // contoh: 'otomotif' atau 'otomotif/servis-mobil'
  display_name: string
  description:  string | null
  icon_name:    string | null            // nama icon Tabler
  icon_bg:      string | null            // warna background icon hex
  sort_order:   number
  parent_id:    string | null            // NULL = root kategori
  level:        CategoryLevel
  is_active:    boolean
  created_at:   string
  created_by:   string | null
  updated_at:   string
  updated_by:   string | null
  deleted_at:   string | null            // NULL = aktif (soft delete)
  deleted_by:   string | null
}

// ─── Category dengan Sub (untuk tabel hierarki collapsible) ──────────────────

export interface CategoryDenganSub extends Category {
  sub_categories: Category[]            // sub-kategori anak langsung
  // Aggregasi
  total_assignments: number             // berapa tenant aktif yang pegang ini
}

// ─── Category List Item (untuk tabel List Categories page) ───────────────────

export interface CategoryListItem {
  id:             string
  slug:           string
  display_name:   string
  icon_name:      string | null
  icon_bg:        string | null
  sort_order:     number
  parent_id:      string | null
  level:          CategoryLevel
  is_active:      boolean
  created_at:     string
  // Joins & aggregasi
  total_tenants:  number               // berapa tenant aktif yang pegang kategori ini
  total_vendors:  number               // berapa vendor aktif di kategori ini
  tenant_names:   string[]             // nama-nama tenant (max 3 untuk tooltip)
}

// ─── Breadcrumb Path (untuk tabel di Tab Kategori Detail Tenant) ──────────────

export interface CategoryBreadcrumb {
  id:            string
  display_name:  string
  slug:          string
  level:         CategoryLevel
  parent_name:   string | null         // nama parent untuk level 2
}

// ─── Tree Node (untuk treeview di Dialog Assign Kategori) ─────────────────────

export type CategoryTreeNodeStatus =
  | 'dipegang_tenant_ini'  // hijau — sudah dipegang tenant yang sedang dibuka
  | 'dipegang_tenant_lain' // merah — dipegang tenant lain
  | 'tersedia'             // abu — bebas, bisa diassign

export interface CategoryTreeNode {
  id:            string
  slug:          string
  display_name:  string
  icon_name:     string | null
  icon_bg:       string | null
  level:         CategoryLevel
  parent_id:     string | null
  is_active:     boolean
  status:        CategoryTreeNodeStatus
  tenant_pemegang: string | null       // nama tenant lain (jika status = dipegang_tenant_lain)
  assignment_id:   string | null       // ID assignment jika sudah dipegang
  sub_nodes:     CategoryTreeNode[]    // sub-kategori (kosong jika level 2)
}

// ─── Payload: Buat Root Kategori ─────────────────────────────────────────────

export interface BuatRootCategoryPayload {
  display_name: string
  slug:         string
  icon_name:    string | null
  icon_bg:      string | null
  description:  string | null
}

// ─── Payload: Buat Sub-Kategori ───────────────────────────────────────────────

export interface BuatSubCategoryPayload {
  parent_id:    string
  display_name: string
  slug:         string
  icon_name:    string | null
  description:  string | null
  is_active:    boolean
}

// ─── Payload: Update Kategori (semua field opsional — partial update) ─────────

export interface UpdateCategoryPayload {
  display_name?:  string
  slug?:          string
  icon_name?:     string | null
  icon_bg?:       string | null
  description?:   string | null
  sort_order?:    number
  parent_id?:     string | null     // pindah sub ke root lain
  is_active?:     boolean
}

// ─── Filter: List Categories ──────────────────────────────────────────────────

export interface CategoryListFilter {
  level?:       CategoryLevel
  is_active?:   boolean
  assigned?:    boolean     // true = sudah di-assign, false = belum
  search?:      string
  page?:        number
  limit?:       number
}

// ─── Stats Row: halaman List Categories ──────────────────────────────────────

export interface CategoryStats {
  total_root:        number
  total_sub:         number
  total_assigned:    number
  total_unassigned:  number
}

// ─── Response: API List Categories ───────────────────────────────────────────

export interface CategoryListResponse {
  data:    CategoryListItem[]
  stats:   CategoryStats
  total:   number
  page:    number
  limit:   number
}
