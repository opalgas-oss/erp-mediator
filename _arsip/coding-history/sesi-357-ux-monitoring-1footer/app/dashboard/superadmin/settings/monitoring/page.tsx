// app/dashboard/superadmin/settings/monitoring/page.tsx
// M06 — Pengaturan Monitoring
// Route: /dashboard/superadmin/settings/monitoring
// Menu induk: KONFIGURASI (bukan Monitoring) — keputusan final S#280
// Breadcrumb: Konfigurasi > Monitoring
//
// Dibuat: Sesi #283 — LANGKAH 2 Monitoring Pages
// PERUBAHAN S#337 — FIX-1:
//   Tambah section Alert via getConfigItemsByKategori('Alert').
//   Sebelumnya hanya getConfigPageItems('monitoring') → 11 config alert.* tidak pernah tampil.
//   Sekarang: 2 query paralel — Monitoring (feature_key='monitoring' + capacity_*) + Alert (kategori='Alert').
//   SA bisa lihat + edit semua 12 item Alert dari halaman ini.
// PERUBAHAN S#347 — FIX-B2-MULTI-RECIPIENT:
//   Recipient policy_key (superadmin_alert_wa_number + superadmin_alert_email)
//   dipisah dari alertRows dan dirender via AlertConfigPageClient (multi-input UI).
//   Non-recipient Alert rows tetap dirender via ConfigPageClient (shared, tidak diubah).
// PERUBAHAN S#356 — BLUEPRINT_RECIPIENT_ALERT_VS_DIGEST (split alert vs digest):
//   Recipient dipecah 2 sumber/2 kartu:
//     Alert  (alert_wa_number/alert_email)   kategori='Alert'      -> dari alertRows
//     Digest (digest_wa_number/digest_email) kategori='Monitoring' -> dari monitoringRows
//   Keduanya dikirim ke AlertConfigPageClient sebagai initialGroups (2 kartu, satu footer).
//   Alert card (13 item) kini pakai nonRecipientAlertRows agar recipient tidak dobel muncul.

export const dynamic = 'force-dynamic'

import { getConfigPageItems, getConfigItemsByKategori } from '@/lib/config-registry'
import { mapTipe, mapValue, parseMultiValue }           from '@/lib/utils/config-page.utils'
import { ConfigPageClient }                             from '../security-login/ConfigPageClient'
import { AlertConfigPageClient }                        from './AlertConfigPageClient'
import type { ConfigItemData }                          from '@/components/ConfigItem'

// policy_key penerima Alert real-time -> kartu "Penerima Notifikasi Alert" (feature_key='alert')
const ALERT_RECIPIENT_KEYS = new Set([
  'alert_wa_number',
  'alert_email',
])

// policy_key penerima Laporan Harian (digest) -> kartu "Penerima Laporan Harian" (feature_key='monitoring')
const DIGEST_RECIPIENT_KEYS = new Set([
  'digest_wa_number',
  'digest_email',
])

export default async function MonitoringSettingsPage() {
  // Dua query paralel — tidak saling blocking
  const [monitoringRows, alertRows] = await Promise.all([
    getConfigPageItems('monitoring'),
    getConfigItemsByKategori('Alert'),
  ])

  // ── Pisah recipient (2 sumber) dari non-recipient ────────────────────────────
  // S#356 blueprint split:
  //   Alert recipients  (alert_wa_number/alert_email)   kategori='Alert'      -> alertRows
  //   Digest recipients (digest_wa_number/digest_email) kategori='Monitoring' -> monitoringRows
  const alertRecipientRows = alertRows.filter(
    (row) => ALERT_RECIPIENT_KEYS.has(row.policy_key ?? '')
  )
  const digestRecipientRows = monitoringRows.filter(
    (row) => DIGEST_RECIPIENT_KEYS.has(row.policy_key ?? '')
  )
  const nonRecipientAlertRows = alertRows.filter(
    (row) => !ALERT_RECIPIENT_KEYS.has(row.policy_key ?? '')
  )
  const nonRecipientMonitoringRows = monitoringRows.filter(
    (row) => !DIGEST_RECIPIENT_KEYS.has(row.policy_key ?? '')
  )

  // ── Build field per baris recipient (WA dulu, Email kedua) ───────────────────
  function buildRecipientField(row: typeof monitoringRows[0]) {
    const policyKey = row.policy_key ?? row.feature_key
    const isWa      = policyKey.includes('wa_number')
    return {
      id:          row.id,
      label:       row.label,
      fieldName:   policyKey,
      feature_key: row.feature_key,
      values:      parseMultiValue(row.nilai),
      enabled:     row.is_active ?? true,
      placeholder: isWa ? 'contoh: 628111000111' : 'contoh: admin@domain.com',
    }
  }

  // Rank untuk urutkan WA sebelum Email dalam satu grup
  function waRank(row: typeof monitoringRows[0]): number {
    return (row.policy_key ?? '').includes('wa_number') ? 0 : 1
  }

  // ── Susun 2 grup recipient; buang grup kosong ────────────────────────────────
  const recipientGroups = [
    {
      title:       'Penerima Notifikasi Alert',
      description: 'Dikirim seketika saat provider bermasalah (DOWN, lambat, kuota hampir habis). Bisa tengah malam.',
      fields:      [...alertRecipientRows].sort((a, b) => waRank(a) - waRank(b)).map(buildRecipientField),
    },
    {
      title:       'Penerima Laporan Harian',
      description: 'Dikirim setiap pagi 07:00 WIB. Ringkasan insiden kemarin. Tidak perlu tindakan segera.',
      fields:      [...digestRecipientRows].sort((a, b) => waRank(a) - waRank(b)).map(buildRecipientField),
    },
  ].filter((group) => group.fields.length > 0)

  // ── Build initialData untuk ConfigPageClient (non-recipient) ─────────────────
  const groupMap = new Map<string, {
    title:       string
    feature_key: string
    items:       ConfigItemData[]
  }>()

  function processRow(row: typeof monitoringRows[0]) {
    const kat       = row.kategori    ?? 'Monitoring'
    const policyKey = row.policy_key  ?? row.feature_key

    if (!groupMap.has(kat)) {
      groupMap.set(kat, { title: kat, feature_key: row.feature_key, items: [] })
    }

    const item: ConfigItemData = {
      id:                       row.id,
      label:                    row.label,
      fieldName:                policyKey,
      type:                     mapTipe(row.tipe_data, policyKey),
      value:                    mapValue(row.nilai, row.tipe_data),
      options:                  row.nilai_enum ?? undefined,
      valueType:                undefined,
      perRoleOptions:           undefined,
      allowedRoles:             undefined,
      hideTenantOverrideToggle: true,
      option_group_id:          null,
      adminCanChange:           false,
      enabled:                  row.is_active ?? true,
    }

    groupMap.get(kat)!.items.push(item)
  }

  for (const row of nonRecipientMonitoringRows) {
    processRow(row)
  }
  for (const row of nonRecipientAlertRows) {
    processRow(row)
  }

  const initialData = Array.from(groupMap.values())

  // ── Render: dua section dalam satu halaman ───────────────────────────────────
  return (
    <div className="flex flex-col gap-0">
      {/* Section 1: Monitoring + Alert non-recipient — pakai ConfigPageClient shared */}
      {initialData.length > 0 && (
        <ConfigPageClient initialData={initialData} />
      )}
      {/* Section 2: Penerima Alert + Digest — 2 kartu multi-input via AlertConfigPageClient */}
      {recipientGroups.length > 0 && (
        <AlertConfigPageClient initialGroups={recipientGroups} />
      )}
    </div>
  )
}
