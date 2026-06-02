// lib/types/admin-tenant.types.ts
// Tipe data untuk HUTANG-AT-AUTH — entitas AdminTenant (orang yang login ke dashboard tenant)
// Dipakai oleh: admin-tenant.repository.ts, admin-tenant.service.ts, API routes AT, UI Tab AdminTenant
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2
//
// Referensi: TDD_AT_AUTH_v1.md Section 5.1, FSD_AT_AUTH_v1.md, KEPUTUSAN_AT_AUTH_S227.md
// ATURAN 41: role = 'admin_tenant' (lowercase)
// KP-01: tidak ada invariant "1 aktif per jabatan" — banyak AT aktif boleh
// KP-02: kontak denormalized tenants diisi oleh penanggung_jawab pertama saja

import 'server-only'

// ─── Literal Types ────────────────────────────────────────────────────────────

export type AdminTenantJabatan =
  | 'penanggung_jawab'
  | 'operator'
  | 'finance'
  | 'warehouse'
  | 'sales'
  | 'lainnya'

export type AdminTenantRelasiPerusahaan =
  | 'owner'
  | 'direktur'
  | 'karyawan'
  | 'konsultan'
  | 'keluarga_pemilik'

// Alasan cabut akses — K-21 FINAL (dari KEPUTUSAN_AT_AUTH_S227 Bagian 10)
// Nilai ini sesuai CHECK constraint chk_pic_alasan di DB
export type AdminTenantAlasanCabut =
  | 'resign'
  | 'mutasi'
  | 'kontrak_berakhir'
  | 'lainnya'

// ─── Entitas: Riwayat AdminTenant (full row DB tenant_admintenant_history) ─────

export interface AdminTenantHistory {
  id:                    string
  tenant_id:             string
  user_id:               string | null      // NULL = akun belum aktif (belum klik aktivasi)
  user_name:             string
  user_email:            string | null
  user_wa:               string | null
  jabatan:               AdminTenantJabatan | null
  relasi_ke_perusahaan:  AdminTenantRelasiPerusahaan | null
  started_at:            string
  ended_at:              string | null      // NULL = masih aktif sebagai AdminTenant
  replaced_by_user_id:   string | null
  replaced_by_name:      string | null
  alasan_pergantian:     string | null
  tanggal_efektif:       string | null
  dokumen_serah_terima:  string | null
  catatan:               string | null
  assigned_by:           string | null
  created_at:            string
}

// ─── AdminTenant Aktif (ringkasan untuk baris tabel di Tab AdminTenant) ────────

export interface AdminTenantKartu {
  id:                   string              // ID riwayat di tenant_admintenant_history
  tenant_id:            string
  user_id:              string | null
  user_name:            string
  user_email:           string | null
  user_wa:              string | null
  jabatan:              AdminTenantJabatan | null
  relasi_ke_perusahaan: AdminTenantRelasiPerusahaan | null
  started_at:           string
  // BUG-029 FIX S#242: lifecycle_status dari user_profiles (JOIN)
  // 'active' = sudah klik aktivasi, 'in_registration' = belum
  lifecycle_status:     string | null
  // sudah_aktivasi = true jika lifecycle_status === 'active'
  sudah_aktivasi:       boolean
}

// ─── Payload: Tambah AdminTenant Baru (email belum terdaftar — F-REQ-01) ───────

export interface TambahAdminTenantPayload {
  tenant_id:             string
  nama:                  string
  email:                 string
  nomor_wa:              string
  jabatan:               AdminTenantJabatan
  relasi_ke_perusahaan:  AdminTenantRelasiPerusahaan
}

// ─── Payload: Tambah AdminTenant Existing (email sudah terdaftar — F-REQ-05) ───

export interface TambahAdminTenantExistingPayload {
  tenant_id:             string
  user_id:               string          // ID akun existing di auth.users
  jabatan:               AdminTenantJabatan
  relasi_ke_perusahaan:  AdminTenantRelasiPerusahaan
}

// ─── Payload: Edit Data AdminTenant In-Place (F-REQ-12) ────────────────────────
// Edit = UPDATE in-place nama/WA orang yang SAMA. Tidak buat baris history baru.
// BUG-032 FIX S#242: tambah email (K-29 — email editable untuk koreksi typo)

export interface EditAdminTenantPayload {
  history_id:  string          // ID baris di tenant_admintenant_history yang diedit
  user_name:   string
  user_wa:     string | null
  email?:      string | null   // K-29: jika berubah → kirim ulang tautan aktivasi
}

// ─── Payload: Ganti Penanggung Jawab (F-REQ-10) ────────────────────────────────
// Ganti = orang berbeda. Menutup baris lama + buat baris baru.

export interface GantiPenanggungJawabPayload {
  tenant_id:             string
  // Data AT baru
  new_user_id:           string          // user_id AT baru (sudah ada akun atau baru)
  new_user_name:         string
  new_user_email:        string
  new_user_wa:           string
  new_jabatan:           AdminTenantJabatan
  new_relasi:            AdminTenantRelasiPerusahaan
  // Alasan & tanggal (untuk menutup baris AT lama)
  alasan_pergantian:     string          // CHECK chk_pic_alasan
  tanggal_efektif:       string          // format YYYY-MM-DD
  catatan?:              string | null
}

// ─── Payload: Cabut Akses AdminTenant (F-REQ-14) ───────────────────────────────
// Cabut eksplisit kapan saja — K-21 alasan, K-22 tanpa alert

export interface CabutAksesAdminTenantPayload {
  tenant_id:   string
  history_id:  string               // ID baris tenant_admintenant_history yang dicabut
  alasan:      AdminTenantAlasanCabut
}

// ─── Response: Cek Email Terdaftar (F-REQ-03 gerbang) ─────────────────────────

export interface CekEmailResult {
  exists:               boolean
  user_id?:             string         // UUID di auth.users jika sudah ada
  user_name?:           string
  user_email?:          string
  user_wa?:             string
  role_existing?:       string         // role pertama yang ditemukan (untuk dialog)
  has_active_membership?: boolean      // sudah AT aktif di tenant ini?
}

// ─── Response: Tab AdminTenant ─────────────────────────────────────────────────

export interface AdminTenantTabData {
  aktif:          AdminTenantKartu[]
  riwayat:        AdminTenantHistory[]
  ada_peringatan: boolean              // true jika tidak ada penanggung_jawab aktif
}
