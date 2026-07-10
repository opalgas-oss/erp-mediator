// lib/helpers/alert-quiet-hours.helper.ts
// Helper: cek apakah waktu sekarang (WIB) masuk rentang jam tenang
// Dipakai oleh: alert.service.ts — evaluateRule() filter severity WARNING/INFO
// Dibuat: Sesi #345 — B2 Severity Logic
//
// Jam tenang dari config_registry (SA-configurable, anti-hardcode — ATURAN 8):
//   alert.quiet_hours_start  (default: '22')
//   alert.quiet_hours_end    (default: '6')
//
// Fail-safe: jika config tidak ada atau error → return false (tidak suppress, kirim tetap)
// Kasus lintas tengah malam ditangani: start=22, end=6 → jamWIB >= 22 ATAU < 6

import 'server-only'
import { getConfigValues } from '@/lib/config-registry'

/**
 * Cek apakah jam sekarang (WIB = UTC+7) masuk rentang jam tenang dari config_registry.
 *
 * Return true  → sekarang jam tenang → WARNING/INFO tidak dikirim
 * Return false → bukan jam tenang   → kirim seperti biasa
 *
 * Fail-safe: error atau config tidak ada → false (tidak suppress)
 */
export async function isQuietHour(): Promise<boolean> {
  try {
    const cfg        = await getConfigValues('monitoring')
    const startRaw   = cfg['alert.quiet_hours_start']
    const endRaw     = cfg['alert.quiet_hours_end']

    // Jika config belum diisi SA — tidak suppress (fail-safe)
    if (startRaw == null || endRaw == null) return false

    const startHour = parseInt(startRaw, 10)
    const endHour   = parseInt(endRaw,   10)

    // Validasi nilai jam (0–23)
    if (isNaN(startHour) || isNaN(endHour)) return false
    if (startHour < 0 || startHour > 23)    return false
    if (endHour   < 0 || endHour   > 23)    return false

    // Jam WIB saat ini (UTC+7)
    const nowUtcHour = new Date().getUTCHours()
    const jamWIB     = (nowUtcHour + 7) % 24

    // Kasus normal: start < end (misal 08:00 s/d 22:00)
    if (startHour < endHour) {
      return jamWIB >= startHour && jamWIB < endHour
    }

    // Kasus lintas tengah malam: start >= end (misal 22:00 s/d 06:00)
    // Jam tenang jika: jamWIB >= 22 ATAU jamWIB < 6
    return jamWIB >= startHour || jamWIB < endHour

  } catch {
    // Error apapun → fail-safe: tidak suppress
    return false
  }
}
