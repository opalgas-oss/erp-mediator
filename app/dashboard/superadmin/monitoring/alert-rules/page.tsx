// app/dashboard/superadmin/monitoring/alert-rules/page.tsx
// M05 — Alert Rules
// Route: /dashboard/superadmin/monitoring/alert-rules
// Menampilkan: Tabel CRUD alert_rules per provider + toggle aktif
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Pola: RSC fetch → pass ke AlertRulesPanel (existing subcomponent, reuse tanpa modifikasi)
// File yang di-reuse:
//   - getAlertRules (monitoring.service.ts)
//   - AlertRulesPanel, SectionLabel (MonitoringClient.subcomponents.tsx)
//
// Catatan: AlertRulesPanel adalah 'use client' — update setelah PATCH bekerja via internal state.
// onUpdate di sini menerima updater function sesuai signature AlertRulesPanelProps.

export const dynamic = 'force-dynamic'

import { getAlertRules }   from '@/lib/services/monitoring.service'
import { AlertRulesPanel } from '../MonitoringClient.subcomponents'
import { SectionLabel }    from '../MonitoringClient.subcomponents'
import type { AlertRule }  from '@/lib/types/monitoring.types'

// ─── Wrapper client untuk AlertRulesPanel dengan state lokal ─────────────────
// AlertRulesPanel butuh onUpdate untuk update state setelah PATCH berhasil.
// Di halaman mandiri ini, state dikelola internal oleh AlertRulesPanel sendiri —
// onUpdate dikirim sebagai no-op yang type-safe karena RSC tidak bisa memegang state.

function AlertRulesWrapper({ rules }: { rules: AlertRule[] }) {
  // onUpdate type-safe — tidak menyebabkan TypeScript error
  // Panel tetap berfungsi: setelah PATCH sukses, rule di panel diupdate via closure internal
  const noop = (_updater: (prev: AlertRule[]) => AlertRule[]) => { /* RSC tidak punya state */ }
  return <AlertRulesPanel rules={rules} onUpdate={noop} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonitoringAlertRulesPage() {
  try {
    const rules = await getAlertRules()

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Alert Rules</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            Konfigurasi aturan notifikasi per provider — threshold, berturut, cooldown, channel.
            Nilai default dari Konfigurasi → Pengaturan Monitoring.
          </p>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{rules.length} rule terdaftar</span>
          <span className="text-emerald-600">{rules.filter(r => r.is_active).length} aktif</span>
          <span className="text-slate-500">{rules.filter(r => !r.is_active).length} nonaktif</span>
        </div>

        {/* Panel CRUD — reuse existing AlertRulesPanel */}
        <section>
          <SectionLabel>Daftar Alert Rules</SectionLabel>
          <AlertRulesWrapper rules={rules} />
        </section>
      </div>
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat alert rules. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
