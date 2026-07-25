// lib/maintenance.ts
// Server-side reader untuk kondisi & tampilan halaman Maintenance.
// Sumber: config_registry (feature_key='sistem') + message_library (teks pesan).
// Anti-hardcode (K-411-3): semua nilai dari config; NOL hardcode.
//
// Dibuat: Sesi #412 — HUTANG-PAGE-CONFIG-SA page `sistem`, consumer loop-tertutup (ATURAN 34).
// Dipakai oleh gate maintenance di: app/page.tsx (homepage/publik) + app/dashboard/vendor/layout.tsx.
// getConfigPageItems() dipakai (BUKAN getConfigValues) supaya nilai field non-mode tetap terbaca
// walau is_active-nya di-toggle — kecuali maintenance_mode yang justru dipakai sebagai sinyal ON/OFF.

import 'server-only'
import { getConfigPageItems } from '@/lib/config-registry'
import { getMessage }         from '@/lib/message-library'

export interface MaintenanceConfig {
  on:           boolean
  title:        string
  body:         string
  illustration: string   // id preset (preset_*) ATAU URL hasil upload (Supabase Storage)
  theme:        string   // terang | brand | senja | mint
  eta:          string
  showContact:  boolean
}

// Baca semua field sistem → bentuk MaintenanceConfig.
// maintenance_mode = sinyal ON/OFF (toggle set nilai+is_active bersamaan).
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const rows = await getConfigPageItems('sistem')

  const map: Record<string, string> = {}
  for (const r of rows) {
    if (r.policy_key) map[r.policy_key] = r.nilai
  }

  const on = map['maintenance_mode'] === 'true'

  // Pesan: config menyimpan KEY message_library (keputusan Philips S#412), teks diedit di menu Pesan.
  const messageKey = map['maintenance_message'] || 'maintenance_body'
  const body = await getMessage(messageKey, 'Mohon maaf, situs sedang dalam perbaikan. Kami akan segera kembali.')

  return {
    on,
    title:        map['maintenance_title']        || 'Sedang Dalam Perbaikan',
    body,
    illustration: map['maintenance_illustration'] || 'preset_wrench',
    theme:        map['maintenance_theme']        || 'terang',
    eta:          map['maintenance_eta']          || '',
    showContact:  map['maintenance_show_contact'] === 'true',
  }
}
