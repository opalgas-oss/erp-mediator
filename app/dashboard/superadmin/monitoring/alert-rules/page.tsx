// app/dashboard/superadmin/monitoring/alert-rules/page.tsx
// M05 — Alert Rules
// Route: /dashboard/superadmin/monitoring/alert-rules
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Fix: pindah AlertRulesWrapper ke file 'use client' terpisah agar
//      fungsi onUpdate tidak di-pass langsung dari RSC (tidak bisa di-serialize)

export const dynamic = 'force-dynamic'

import { getAlertRules }      from '@/lib/services/monitoring.service'
import { SectionLabel }       from '../MonitoringClient.subcomponents'
import { AlertRulesWrapper }  from './AlertRulesWrapper'

export default async function MonitoringAlertRulesPage() {
  try {
    const rules = await getAlertRules()

    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Alert Rules</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            Konfigurasi aturan notifikasi per provider — threshold, berturut, cooldown, channel.
            Nilai default dari Konfigurasi → Pengaturan Monitoring.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{rules.length} rule terdaftar</span>
          <span className="text-emerald-600">{rules.filter(r => r.is_active).length} aktif</span>
          <span className="text-slate-500">{rules.filter(r => !r.is_active).length} nonaktif</span>
        </div>

        <section>
          <SectionLabel>Daftar Alert Rules</SectionLabel>
          <AlertRulesWrapper initialRules={rules} />
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
