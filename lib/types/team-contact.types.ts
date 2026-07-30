// lib/types/team-contact.types.ts
// Tipe data untuk Direktori Kontak Tim Tahap A (tabel team_contacts).
// Dipakai oleh: team-contact.repository.ts, team-contact.service.ts, TeamContactsClient.tsx
// Dibuat: Sesi #422 — Direktori Kontak Tim Tahap A, FASE 3.2
//
// Tabel: team_contacts — 19 kolom, RLS ENABLED, NOL policy anon.
//        Konsekuensi mengikat: pembacaan kontak terpublikasi untuk halaman maintenance
//        publik WAJIB lewat server (service_role/rolbypassrls), tidak boleh dari klien.
// Acuan: Shared_Database/Schema_TeamContacts.md
//        03_Architecture/00_Global/DESAIN_MAINTENANCE_DAN_KONTAK_TIM.md §6.1 + §6.3

// ─── Literal Types ───────────────────────────────────────────────────────────
// Nilai lowercase (ATURAN 41). Keduanya menegakkan CHECK constraint yang sudah
// hidup di DB — bukan daftar baru: chk_team_contacts_scope + chk_team_contacts_jabatan.

export type TeamContactScope = 'super_admin' | 'admin_tenant' | 'vendor'

/** 6 jabatan resmi GLOSSARY BAB 7. Istilah "PIC" DILARANG (ditegaskan Philips S#413). */
export type JabatanKontak =
  | 'penanggung_jawab'
  | 'operator'
  | 'finance'
  | 'warehouse'
  | 'sales'
  | 'lainnya'

/** Arah geser prioritas. SA menggeser lewat tombol panah — tidak pernah mengetik angka (K-419-3). */
export type ArahGeser = 'naik' | 'turun'

// ─── Entitas: baris mentah team_contacts (flat, dari Supabase) ────────────────

export interface TeamContactRow {
  id:                    string
  scope:                 TeamContactScope
  tenant_id:             string | null   // NULL untuk tim SA; WAJIB terisi untuk scope admin_tenant
  vendor_id:             string | null   // FK → vendor_profiles(id). Tabel `vendors` TIDAK ADA
  user_id:               string | null   // NULL diizinkan — kontak boleh ada tanpa akun login
  nama:                  string
  telepon:               string | null
  email:                 string
  jabatan:               JabatanKontak
  publish_bug_dashboard: boolean         // tampil di halaman error Dashboard SA/AT
  publish_public_page:   boolean         // tampil di halaman maintenance publik
  is_active:             boolean         // is_active — BUKAN is_aktif (BUG-039)
  sort_order:            number          // DEFAULT 0 di DB; jenjang 10/20/30 dihitung service (max+10)
  created_at:            string
  created_by:            string | null
  updated_at:            string
  updated_by:            string | null
  deleted_at:            string | null   // soft delete — NULL = aktif/tersedia
  deleted_by:            string | null
}

// ─── Payload: Buat Kontak ────────────────────────────────────────────────────
// sort_order TIDAK ada di payload — nilainya dihitung service (max+10), bukan dikirim UI.

export interface BuatKontakTimPayload {
  scope:                 TeamContactScope
  tenant_id:             string | null
  vendor_id:             string | null
  user_id:               string | null
  nama:                  string
  telepon:               string | null
  email:                 string
  jabatan:               JabatanKontak
  publish_bug_dashboard: boolean
  publish_public_page:   boolean
}

// ─── Payload: Ubah Kontak (semua field opsional — partial update) ─────────────

export interface UbahKontakTimPayload {
  nama?:                  string
  telepon?:               string | null
  email?:                 string
  jabatan?:               JabatanKontak
  publish_bug_dashboard?: boolean
  publish_public_page?:   boolean
  is_active?:             boolean
}

// ─── Payload: Geser Prioritas ────────────────────────────────────────────────
// Menggeser = TUKAR sort_order dengan baris tetangga → menyentuh 2 BARIS, bukan 1.

export interface GeserKontakTimPayload {
  id:   string
  arah: ArahGeser
}

// ─── Struktur siap-render: baris tabel Direktori Kontak Tim (Dashboard SA) ────

export interface KontakTimBaris {
  id:                  string
  /**
   * POSISI ORDINAL hasil urut (1·2·3·4) — BUKAN nilai sort_order.
   * Mockup SA v2 (disetujui S#419) menampilkan peringkat urut; DB menyimpan 10/20/30.
   * Merender sort_order mentah di kolom ini = menampilkan angka yang salah ke SA.
   */
  prioritas:           number
  nama:                string
  telepon:             string | null
  email:               string
  jabatan:             JabatanKontak
  publishBugDashboard: boolean
  publishPublicPage:   boolean
  isActive:            boolean
  /** true bila baris ini paling atas — tombol panah naik dinonaktifkan */
  isPertama:           boolean
  /** true bila baris ini paling bawah — tombol panah turun dinonaktifkan */
  isTerakhir:          boolean
}

// ─── Struktur siap-render: kontak terpublikasi (halaman publik + halaman error) ─

/**
 * Kontak yang dipakai tautan "hubungi tim kami".
 * Dipilih dengan urutan `sort_order ASC, created_at ASC` lalu ambil pertama.
 * Pemecah seri `created_at` WAJIB: sort_order lahir DEFAULT 0, dan tanpa pemecah seri
 * alamat tujuan halaman publik bisa berganti sendiri antar-request (§6.3).
 */
export interface KontakTerpublikasi {
  nama:    string
  email:   string
  telepon: string | null
  jabatan: JabatanKontak
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface KontakTimListResponse {
  success: boolean
  data:    KontakTimBaris[]
}
