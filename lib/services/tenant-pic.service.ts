// lib/services/tenant-pic.service.ts
// STUB — Sesi #240 STEP C
// Fungsi PIC cadangan (tambah/hapus/update) sudah dihapus — konsep cadangan tidak ada lagi.
// getTabData dipertahankan sementara sampai route change-pic dihapus di STEP C-8/C-9.
//
// Referensi arsip: _arsip/coding-history/sesi-240-hutang-at-auth-step-c/tenant-pic.service.ts

import 'server-only'
import {
  findAktifByTenantId,
  findAllByTenantId,
  buildKartuFromHistory,
} from '@/lib/repositories/tenant-pic.repository'
import type {
  PICKartu,
  TenantPICTabData,
} from '@/lib/types/tenant-pic.types'

// ─── TenantPICService_getTabData ──────────────────────────────────────────────
// Sisa sementara — akan dihapus setelah route change-pic dihapus di STEP C-8/C-9.

export async function TenantPICService_getTabData(
  tenantId: string
): Promise<TenantPICTabData> {
  const [utamaRow, cadanganRow, allHistory] = await Promise.all([
    findAktifByTenantId(tenantId, 'utama'),
    findAktifByTenantId(tenantId, 'cadangan'),
    findAllByTenantId(tenantId),
  ])

  const picUtama:    PICKartu | null = utamaRow    ? buildKartuFromHistory(utamaRow)    : null
  const picCadangan: PICKartu | null = cadanganRow ? buildKartuFromHistory(cadanganRow) : null

  return {
    pic_utama:      picUtama,
    pic_cadangan:   picCadangan,
    timeline:       [],
    ada_peringatan: picCadangan === null,
  }
}
