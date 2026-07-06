// lib/types/tenant-fee.types.ts
// Tipe data untuk Fee Structure Engine — Section C TabKontrakSewa
// Dibuat: Sesi #319 — Fee Structure Engine (anti-hardcode)
// Dipakai oleh: tenant-fee.repository.ts, tenant-fee.service.ts, API /api/superadmin/tenants/[id]/fees

// ─── Literal Types ────────────────────────────────────────────────────────────

export type FeeTipe = 'persen' | 'flat' | 'hybrid' | 'info'

export type FeeBerlakuUntuk = 'per_transaksi' | 'per_order' | 'per_bulan'

export type FeeAksi = 'tambah' | 'ubah' | 'jadwalkan' | 'batalkan'

// fee_key yang dikenal platform (bisa extend dengan baris baru)
export type FeeKey =
  | 'komisi_platform'
  | 'biaya_proses_order'
  | 'gateway_xendit'
  | 'ppn_info'
  | string   // untuk fee custom tenant

// ─── Entitas: TenantFee (full row DB) ────────────────────────────────────────

export interface TenantFee {
  id:             string
  tenant_id:      string
  fee_key:        FeeKey
  nama_biaya:     string
  tipe:           FeeTipe
  nilai_persen:   number | null        // % (contoh: 8 = 8%)
  nilai_flat:     number | null        // Rp nominal (contoh: 1250)
  nilai_maks:     number | null        // cap Rp (nullable)
  berlaku_untuk:  FeeBerlakuUntuk
  ppn_inklusif:   boolean
  passthrough:    boolean
  berlaku_mulai:  string              // DATE sebagai string ISO
  berlaku_sampai: string | null       // NULL = selamanya
  alasan:         string | null
  is_active:      boolean
  created_by:     string | null
  created_at:     string
}

// ─── Entitas: TenantFeeHistory (immutable audit trail) ───────────────────────

export interface TenantFeeHistory {
  id:            string
  tenant_id:     string
  fee_id:        string | null
  fee_key:       FeeKey
  nama_biaya:    string
  aksi:          FeeAksi
  nilai_lama:    FeeNilaiSnapshot | null   // NULL untuk aksi 'tambah'
  nilai_baru:    FeeNilaiSnapshot
  alasan:        string | null
  berlaku_mulai: string | null
  changed_by:    string | null
  changed_at:    string
}

// Snapshot nilai fee untuk disimpan di JSONB
export interface FeeNilaiSnapshot {
  tipe:           FeeTipe
  nilai_persen:   number | null
  nilai_flat:     number | null
  nilai_maks:     number | null
  berlaku_untuk:  FeeBerlakuUntuk
  ppn_inklusif:   boolean
  passthrough:    boolean
}

// ─── Default Fee dari config_registry ────────────────────────────────────────

// Dibaca saat tenant tidak punya override di tenant_fees
export interface FeeDefault {
  komisi_persen:     number    // config_registry: fee_default / komisi_persen
  proses_flat:       number    // config_registry: fee_default / proses_flat
  gateway_persen:    number    // config_registry: fee_default / gateway_persen
  gateway_flat:      number    // config_registry: fee_default / gateway_flat
  ppn_persen:        number    // config_registry: fee_default / ppn_persen
  fee_berlaku_mulai: string    // config_registry: fee_default / fee_berlaku_mulai (format YYYY-MM-DD)
}

// ─── Fee Aktif (yang dipakai UI dan simulator) ────────────────────────────────

// Satu row = satu fee yang berlaku saat ini untuk tenant ini
// Bisa berasal dari tenant_fees (override) atau config_registry (fallback)
export interface FeeAktif {
  fee_key:        FeeKey
  nama_biaya:     string
  tipe:           FeeTipe
  nilai_persen:   number | null
  nilai_flat:     number | null
  nilai_maks:     number | null
  berlaku_untuk:  FeeBerlakuUntuk
  ppn_inklusif:   boolean
  passthrough:    boolean
  berlaku_mulai:  string
  berlaku_sampai: string | null
  sumber:         'tenant_override' | 'platform_default'
  fee_id:         string | null   // NULL jika dari platform_default
}

// ─── Payload: Tambah / Jadwalkan Fee ─────────────────────────────────────────

export interface TambahFeePayload {
  fee_key:        FeeKey
  nama_biaya:     string
  tipe:           FeeTipe
  nilai_persen?:  number
  nilai_flat?:    number
  nilai_maks?:    number
  berlaku_untuk:  FeeBerlakuUntuk
  ppn_inklusif:   boolean
  passthrough:    boolean
  berlaku_mulai:  string    // WAJIB, min H+1 (validasi di service)
  berlaku_sampai?: string
  alasan?:        string
}

// ─── Response: API GET /fees ──────────────────────────────────────────────────

export interface FeeListResponse {
  aktif:     FeeAktif[]            // fee yang berlaku sekarang (berlaku_mulai <= today)
  terjadwal: FeeAktif[]            // fee yang dijadwalkan (berlaku_mulai > today)
  default:   FeeDefault            // nilai fallback dari config_registry
}

// ─── Response: API GET /fees/history ─────────────────────────────────────────

export interface FeeHistoryResponse {
  data:  TenantFeeHistory[]
  total: number
}
