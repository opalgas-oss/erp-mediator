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

export const dynamic = 'force-dynamic'

import { getConfigPageItems, getConfigItemsByKategori } from '@/lib/config-registry'
import { mapTipe, mapValue }                            from '@/lib/utils/config-page.utils'
import { ConfigPageClient }                             from '../security-login/ConfigPageClient'
import { AlertConfigPageClient, parseMultiValue }       from './AlertConfigPageClient'
import type { ConfigItemData }                          from '@/components/ConfigItem'

// policy_key yang masuk multi-input UI (bukan text-field biasa)
const RECIPIENT_KEYS = new Set([
  'superadmin_alert_wa_number',
  'superadmin_alert_email',
])

export default async function MonitoringSettingsPage() {
  // Dua query paralel — tidak saling blocking
  const [monitoringRows, alertRows] = await Promise.all([
    getConfigPageItems('monitoring'),
    getConfigItemsByKategori('Alert'),
  ])

  // ── Pisah: recipient rows → AlertConfigPageClient, sisanya → ConfigPageClient ──
  const recipientRows = alertRows.filter(
    (row) => RECIPIENT_KEYS.has(row.policy_key ?? '')
  )
  const nonRecipientAlertRows = alertRows.filter(
    (row) => !RECIPIENT_KEYS.has(row.policy_key ?? '')
  )

  // ── Build initialFields untuk AlertConfigPageClient ──────────────────────────
  const recipientFields = recipientRows.map((row) => ({
    id:          row.id,
    label:       row.label,
    fieldName:   row.policy_key ?? row.feature_key,
    feature_key: row.feature_key,
    values:      parseMultiValue(row.nilai),
    enabled:     row.is_active ?? true,
    placeholder: row.policy_key === 'superadmin_alert_wa_number'
      ? 'contoh: 628111000111'
      : 'contoh: admin@domain.com',
  }))

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

  for (const row of monitoringRows) {
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
      {/* Section 2: Penerima Alert — multi-input UI via AlertConfigPageClient */}
      {recipientFields.length > 0 && (
        <AlertConfigPageClient initialFields={recipientFields} />
      )}
    </div>
  )
}
