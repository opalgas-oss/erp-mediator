// lib/services/tenant-fee.service.ts
// Service: Fee Structure Engine — business logic validasi + kalkulasi
// Dibuat: Sesi #319 — Fee Structure Engine (anti-hardcode)
// Layer: Service (di atas repository, di bawah API route)

import {
  feeRepo_getAktif,
  feeRepo_getDefault,
  feeRepo_getHistory,
  feeRepo_tambah,
  feeRepo_ubah,
} from '@/lib/repositories/tenant-fee.repository'
import type {
  FeeDefault,
  FeeListResponse,
  FeeHistoryResponse,
  TambahFeePayload,
  TenantFee,
} from '@/lib/types/tenant-fee.types'

// ─── GET fee aktif tenant ─────────────────────────────────────────────────────

export async function feeService_getAktif(tenantId: string): Promise<FeeListResponse> {
  return feeRepo_getAktif(tenantId)
}

// ─── GET fee default platform ─────────────────────────────────────────────────

export async function feeService_getDefault(): Promise<FeeDefault> {
  return feeRepo_getDefault()
}

// ─── GET riwayat fee ──────────────────────────────────────────────────────────

export async function feeService_getHistory(
  tenantId: string,
  limit?:   number,
  offset?:  number,
): Promise<FeeHistoryResponse> {
  return feeRepo_getHistory(tenantId, limit, offset)
}

// ─── POST tambah / jadwalkan fee ─────────────────────────────────────────────

export async function feeService_tambah(
  tenantId:  string,
  payload:   TambahFeePayload,
  changedBy: string,
): Promise<{ success: true; data: TenantFee }> {
  // Validasi 1: effective date min H+1 (tidak retroaktif — ATURAN PENTING #1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const berlaku = new Date(payload.berlaku_mulai)
  berlaku.setHours(0, 0, 0, 0)

  if (berlaku <= today) {
    throw new Error(
      'Tanggal berlaku mulai harus minimal H+1 (tidak bisa retroaktif atau hari ini).'
    )
  }

  // Validasi 2: konsistensi nilai vs tipe
  if (payload.tipe === 'persen' && !payload.nilai_persen) {
    throw new Error('Tipe "persen" wajib mengisi nilai_persen.')
  }
  if (payload.tipe === 'flat' && !payload.nilai_flat) {
    throw new Error('Tipe "flat" wajib mengisi nilai_flat.')
  }
  if (payload.tipe === 'hybrid' && (!payload.nilai_persen || !payload.nilai_flat)) {
    throw new Error('Tipe "hybrid" wajib mengisi nilai_persen DAN nilai_flat.')
  }

  const fee = await feeRepo_tambah(tenantId, payload, changedBy)
  return { success: true, data: fee }
}

// ─── PATCH ubah fee ───────────────────────────────────────────────────────────

export async function feeService_ubah(
  feeId:     string,
  tenantId:  string,
  payload:   Partial<TambahFeePayload>,
  changedBy: string,
): Promise<{ success: true; data: TenantFee }> {
  const fee = await feeRepo_ubah(feeId, tenantId, payload, changedBy)
  return { success: true, data: fee }
}

// ─── Re-export simulator (dipindah ke lib/utils/fee-simulator.ts — S#321 P-03) ─
// Untuk backward compat jika ada import lain dari service ini
export type { SimulatorInput, SimulatorBaris, SimulatorResult } from '@/lib/utils/fee-simulator'
export { hitungSimulasiFee } from '@/lib/utils/fee-simulator'
