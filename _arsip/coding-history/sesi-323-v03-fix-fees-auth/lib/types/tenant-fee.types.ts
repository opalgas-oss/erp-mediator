// ARSIP — sebelum fix C-04 terjadwal (sesi-323-v03-fix-fees-auth)
// lib/types/tenant-fee.types.ts — versi pre-fix (FeeListResponse tanpa terjadwal[])

export type FeeTipe = 'persen' | 'flat' | 'hybrid' | 'info'
export type FeeBerlakuUntuk = 'per_transaksi' | 'per_order' | 'per_bulan'
export type FeeAksi = 'tambah' | 'ubah' | 'jadwalkan' | 'batalkan'
export type FeeKey = 'komisi_platform' | 'biaya_proses_order' | 'gateway_xendit' | 'ppn_info' | string

export interface TenantFee { id: string; tenant_id: string; fee_key: FeeKey; nama_biaya: string; tipe: FeeTipe; nilai_persen: number | null; nilai_flat: number | null; nilai_maks: number | null; berlaku_untuk: FeeBerlakuUntuk; ppn_inklusif: boolean; passthrough: boolean; berlaku_mulai: string; berlaku_sampai: string | null; alasan: string | null; is_active: boolean; created_by: string | null; created_at: string }
export interface TenantFeeHistory { id: string; tenant_id: string; fee_id: string | null; fee_key: FeeKey; nama_biaya: string; aksi: FeeAksi; nilai_lama: FeeNilaiSnapshot | null; nilai_baru: FeeNilaiSnapshot; alasan: string | null; berlaku_mulai: string | null; changed_by: string | null; changed_at: string }
export interface FeeNilaiSnapshot { tipe: FeeTipe; nilai_persen: number | null; nilai_flat: number | null; nilai_maks: number | null; berlaku_untuk: FeeBerlakuUntuk; ppn_inklusif: boolean; passthrough: boolean }
export interface FeeDefault { komisi_persen: number; proses_flat: number; gateway_persen: number; gateway_flat: number; ppn_persen: number; fee_berlaku_mulai: string }
export interface FeeAktif { fee_key: FeeKey; nama_biaya: string; tipe: FeeTipe; nilai_persen: number | null; nilai_flat: number | null; nilai_maks: number | null; berlaku_untuk: FeeBerlakuUntuk; ppn_inklusif: boolean; passthrough: boolean; berlaku_mulai: string; berlaku_sampai: string | null; sumber: 'tenant_override' | 'platform_default'; fee_id: string | null }
export interface TambahFeePayload { fee_key: FeeKey; nama_biaya: string; tipe: FeeTipe; nilai_persen?: number; nilai_flat?: number; nilai_maks?: number; berlaku_untuk: FeeBerlakuUntuk; ppn_inklusif: boolean; passthrough: boolean; berlaku_mulai: string; berlaku_sampai?: string; alasan?: string }
export interface FeeListResponse { aktif: FeeAktif[]; default: FeeDefault }
export interface FeeHistoryResponse { data: TenantFeeHistory[]; total: number }
