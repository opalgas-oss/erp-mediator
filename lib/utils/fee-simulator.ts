// lib/utils/fee-simulator.ts
// Simulator kalkulasi biaya — pure client-safe utility
// Dibuat: Sesi #321 — P-02 refactor GAP-R01 (dipindah dari tenant-fee.service.ts)
//
// PENTING: File ini TIDAK boleh import apapun dari server module (no 'server-only',
// no supabase client, no repository). Pure function yang bisa diimport di client component.
//
// Dipanggil oleh: FeeSimulator di TabKontrakSewa.tsx (client component)

import type { FeeAktif } from '@/lib/types/tenant-fee.types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimulatorInput {
  gmv:    number
  orders: number
  fees:   FeeAktif[]
}

export interface SimulatorBaris {
  fee_key:    string
  nama_biaya: string
  nilai:      number
  rumus:      string     // teks deskriptif untuk ditampilkan ke user
}

export interface SimulatorResult {
  baris: SimulatorBaris[]
  total: number
}

// ─── hitungSimulasiFee ────────────────────────────────────────────────────────
// Deterministik, tanpa DB call. Input: fee aktif dari state + GMV + jumlah order.

export function hitungSimulasiFee(input: SimulatorInput): SimulatorResult {
  const { gmv, orders, fees } = input
  const baris: SimulatorBaris[] = []

  for (const fee of fees) {
    if (fee.tipe === 'info') continue   // baris informasi, tidak dihitung

    let nilai = 0
    let rumus = ''

    if (fee.tipe === 'persen' && fee.nilai_persen !== null) {
      nilai = gmv * (fee.nilai_persen / 100)
      // Cap jika ada nilai_maks
      if (fee.nilai_maks !== null && nilai > fee.nilai_maks) nilai = fee.nilai_maks
      rumus = `${fee.nilai_persen}% × GMV`
    }

    if (fee.tipe === 'flat' && fee.nilai_flat !== null) {
      nilai = orders * fee.nilai_flat
      rumus = `Rp${fee.nilai_flat.toLocaleString('id-ID')} × ${orders} order`
    }

    if (fee.tipe === 'hybrid' && fee.nilai_persen !== null && fee.nilai_flat !== null) {
      const bagianPersen = gmv * (fee.nilai_persen / 100)
      const bagianFlat   = orders * fee.nilai_flat
      nilai = bagianPersen + bagianFlat
      rumus = `${fee.nilai_persen}% GMV + Rp${fee.nilai_flat.toLocaleString('id-ID')}/order`
    }

    baris.push({ fee_key: fee.fee_key, nama_biaya: fee.nama_biaya, nilai, rumus })
  }

  const total = baris.reduce((sum, b) => sum + b.nilai, 0)
  return { baris, total }
}
