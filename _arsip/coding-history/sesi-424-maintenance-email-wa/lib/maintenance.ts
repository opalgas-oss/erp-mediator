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
import { TeamContactService_getKontakTujuan } from '@/lib/services/team-contact.service'

export interface MaintenanceConfig {
  on:           boolean
  title:        string
  body:         string
  illustration: string   // id preset (preset_*) ATAU URL hasil upload (Supabase Storage)
  theme:        string   // terang | brand | senja | mint
  eta:          string
  showContact:  boolean
  // ─── S#423 — menutup DUA teks hardcode di MaintenanceView.tsx ───────────────
  /** Awalan ETA, dari message_library `maintenance_eta_prefix` (dulu hardcode "Perkiraan selesai:") */
  etaPrefix:    string
  /** Teks ajakan, dari message_library `maintenance_contact_cta` (dulu hardcode) */
  ctaText:      string
  /**
   * Alamat tujuan tautan "hubungi tim kami" — kontak terpublikasi PERTAMA
   * (`team_contacts`, `publish_public_page`, urut sort_order).
   *
   * **null = TIDAK ADA alamat → ajakan menghubungi WAJIB tidak ditampilkan** (DESAIN §6.3:
   * "tidak ada ajakan menghubungi tanpa alamat di baliknya"). Dua keadaan menghasilkan null:
   * daftar kontak kosong, ATAU ada kontak tapi nol yang dicentang publikasi publik.
   */
  emailKontak:  string | null
}

// Baca semua field sistem → bentuk MaintenanceConfig.
// maintenance_mode = sinyal ON/OFF (toggle set nilai+is_active bersamaan).
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  const rows = await getConfigPageItems('sistem')

  const map: Record<string, string> = {}
  for (const r of rows) {
    if (r.policy_key) map[r.policy_key] = r.nilai
  }

  const on          = map['maintenance_mode']         === 'true'
  const showContact = map['maintenance_show_contact'] === 'true'

  // Pesan: config menyimpan KEY message_library (keputusan Philips S#412), teks diedit di menu Pesan.
  const messageKey = map['maintenance_message'] || 'maintenance_body'

  // Ketiga teks dibaca paralel — nol tambahan latency dibanding sebelumnya.
  // Nilai fallback = teks lama PERSIS (pola S#363: zero behavior change kalau key belum ada).
  const [body, etaPrefix, ctaText] = await Promise.all([
    getMessage(messageKey, 'Mohon maaf, situs sedang dalam perbaikan. Kami akan segera kembali.'),
    getMessage('maintenance_eta_prefix',  'Perkiraan selesai:'),
    getMessage('maintenance_contact_cta', 'Butuh bantuan? Silakan hubungi tim kami.'),
  ])

  // §6.3 — alamat tujuan HANYA dicari kalau memang akan dipakai. Saat maintenance mati
  // atau toggle kontak mati, nol query tambahan ke team_contacts.
  let emailKontak: string | null = null
  if (on && showContact) {
    const kontak = await TeamContactService_getKontakTujuan('public_page')
    emailKontak  = kontak?.email ?? null
  }

  return {
    on,
    title:        map['maintenance_title']        || 'Sedang Dalam Perbaikan',
    body,
    illustration: map['maintenance_illustration'] || 'preset_wrench',
    theme:        map['maintenance_theme']        || 'terang',
    eta:          map['maintenance_eta']          || '',
    showContact,
    etaPrefix,
    ctaText,
    emailKontak,
  }
}
