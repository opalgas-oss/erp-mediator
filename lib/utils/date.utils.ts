// lib/utils/date.utils.ts
// Utility tanggal/waktu — helper untuk komputasi timestamp masa lalu di repository layer.
//
// Fungsi:
//   - getPastISOTimestamp  — hitung ISO timestamp N unit waktu yang lalu
//
// Dipakai oleh:
//   - lib/repositories/provider-metrics.repository.ts (3 call sites)
//   - lib/repositories/alert-log.repository.ts (1 call site)
//
// Dibuat: Sesi #181 — SL-D006+K007 ekstrak pola new Date(Date.now() - N*unit_ms).toISOString()
// Catatan: Menggantikan inline computation identik di 4 lokasi berbeda

import 'server-only'

/** Mapping unit waktu ke milidetik */
const MS_MAP = {
  minutes: 60_000,
  hours:   3_600_000,
  days:    86_400_000,
} as const

/**
 * Hitung ISO timestamp di masa lalu berdasarkan value dan unit waktu.
 * Menggantikan inline `new Date(Date.now() - N * unit_ms).toISOString()` yang duplikat.
 *
 * @param value - Jumlah unit (misalnya: 60, 24, 30)
 * @param unit  - Satuan waktu: 'minutes' | 'hours' | 'days'
 * @returns ISO 8601 string (contoh: "2026-05-18T10:00:00.000Z")
 *
 * @example
 *   getPastISOTimestamp(60, 'minutes')  // 1 jam yang lalu
 *   getPastISOTimestamp(24, 'hours')    // 24 jam yang lalu
 *   getPastISOTimestamp(30, 'days')     // 30 hari yang lalu
 */
export function getPastISOTimestamp(
  value: number,
  unit:  keyof typeof MS_MAP
): string {
  return new Date(Date.now() - value * MS_MAP[unit]).toISOString()
}
