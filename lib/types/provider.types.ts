// lib/types/provider.types.ts
// Tipe data untuk M3 Credential Management — API Provider & Credential
// Dipakai oleh: credential.repository.ts, credential.service.ts, ProvidersClient.tsx
// Dibuat: Sesi #107 — M3 Credential Management

// ─── Provider ────────────────────────────────────────────────────────────────

export interface ServiceProvider {
  id:             string
  kode:           string
  nama:           string
  kategori:       string
  deskripsi:      string | null
  docs_url:       string | null
  status_url:     string | null
  tag:            'wajib' | 'disarankan' | 'opsional'
  is_aktif:       boolean
  sort_order:     number
  health_overall: HealthStatus   // dihitung dari semua instance provider ini
}

// ─── Instance ────────────────────────────────────────────────────────────────

export interface ProviderInstance {
  id:             string
  provider_id:    string
  nama_server:    string
  deskripsi:      string | null
  is_aktif:       boolean
  is_default:     boolean
  health_status:  HealthStatus
  health_pesan:   string | null
  last_tested_at: string | null
  created_at:     string
  updated_at:     string
}

// ─── Field Definition ────────────────────────────────────────────────────────

export interface ProviderFieldDef {
  id:                string
  provider_id:       string
  field_key:         string
  label:             string
  tipe:              FieldInputType
  is_required:       boolean
  is_secret:         boolean
  options:           SelectOption[] | null
  placeholder:       string | null
  deskripsi:         string | null
  panduan_langkah:   PanduanLangkah[] | null
  deep_link_url:     string | null
  prefix_sandbox:    string | null
  prefix_production: string | null
  nilai_default:     string | null
  sort_order:        number
}

// ─── Credential (UI — nilai tidak pernah di-expose penuh ke browser) ─────────

export interface InstanceCredential {
  field_def_id: string
  field_key:    string
  fingerprint:  string | null   // 4 karakter terakhir — aman tampil di UI
  is_secret:    boolean
  updated_at:   string
}

// ─── Payload: Tambah Instance ────────────────────────────────────────────────

export interface TambahInstancePayload {
  provider_id: string
  nama_server: string
  deskripsi:   string | null
  is_default:  boolean
}

// ─── Payload: Simpan Credential ──────────────────────────────────────────────

export interface SimpanCredentialPayload {
  instance_id: string
  fields: Array<{
    field_def_id: string
    field_key:    string
    nilai:        string   // plaintext — dienkripsi di service sebelum masuk DB
  }>
}

// ─── Test Koneksi ────────────────────────────────────────────────────────────

export interface TestKoneksiResult {
  berhasil:      boolean
  health_status: HealthStatus
  pesan:         string | null
  latency_ms:    number | null
}

// ─── Literal Types ───────────────────────────────────────────────────────────

export type HealthStatus =
  | 'sehat'
  | 'belum_dites'
  | 'peringatan'
  | 'gagal'

export type FieldInputType =
  | 'text'
  | 'secret'
  | 'url'
  | 'number'
  | 'email'
  | 'select'

// ─── Tipe Pendukung ──────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
}

export interface PanduanLangkah {
  no:   number
  teks: string
}
