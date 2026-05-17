'use client'
// app/dashboard/superadmin/monitoring/MonitoringClient.subcomponents.tsx
// Sub-komponen untuk MonitoringClient.tsx.
// Dipecah dari MonitoringClient.tsx S#164 karena file mencapai 15.7 KB (melebihi batas 10 KB ATURAN 9).
//
// Isi:
//   - SectionLabel        — heading section monitoring
//   - SummaryCard         — kartu ringkasan UP/Degraded/Down
//   - AlertRulesPanel     — panel edit alert_rules per provider (collapse toggle)
//   - MonitoringConfigPanel — panel edit config_registry monitoring (BARU T-032)
//
// Dibuat: Sesi #164 — T-032: tambah form edit 10 config monitoring
//
// ARSITEKTUR MonitoringConfigPanel:
//   page.tsx (RSC) → fetch config_registry WHERE feature_key='monitoring'
//   → format ConfigGroup[] → pass ke MonitoringClient → pass ke MonitoringConfigPanel
//   → render ConfigPageClient → save via /api/config/bulk (existing route)
//   Tidak ada API route baru — reuse /api/config/bulk + sp_bulk_update_config

import { useState }             from 'react'
import { ConfigPageClient }     from '../settings/security-login/ConfigPageClient'
import type { AlertRule }       from '@/lib/types/monitoring.types'
import type { ProviderSnapshot } from '@/lib/types/monitoring.types'
import type { ConfigItemData }  from '@/components/ConfigItem'

// ─── Tipe ConfigGroup — harus konsisten dengan ConfigPageClient ───────────────

interface ConfigGroup {
  title:       string
  feature_key: string
  items:       ConfigItemData[]
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  )
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

export function SummaryCard({
  label, value, color,
}: { label: string; value: number; color: 'emerald' | 'amber' | 'red' }) {
  const colors = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber:   'border-amber-200   bg-amber-50   text-amber-900',
    red:     'border-red-200     bg-red-50     text-red-900',
  }
  return (
    <div className={`rounded-md border p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-70">{label}</div>
    </div>
  )
}

// ─── AlertRulesPanel ──────────────────────────────────────────────────────────

interface AlertRulesPanelProps {
  rules:    AlertRule[]
  onUpdate: (updater: (prev: AlertRule[]) => AlertRule[]) => void
}

export function AlertRulesPanel({ rules, onUpdate }: AlertRulesPanelProps) {
  const [savingId, setSavingId] = useState<string | null>(null)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  async function handleSave(rule: AlertRule, field: keyof AlertRule, value: unknown) {
    setSavingId(rule.id)
    setErrors(e => ({ ...e, [rule.id]: '' }))
    try {
      const res  = await fetch(`/api/monitoring/alert-rules/${rule.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (data.success) {
        onUpdate((prev: AlertRule[]) => prev.map(r => r.id === rule.id ? data.data : r))
      } else {
        setErrors(e => ({ ...e, [rule.id]: data.message }))
      }
    } catch {
      setErrors(e => ({ ...e, [rule.id]: 'Gagal menyimpan' }))
    } finally {
      setSavingId(null)
    }
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
        Belum ada alert rules. Rules dibuat otomatis saat cron pertama kali berjalan.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rules.map(rule => (
        <div key={rule.id} className="rounded-md border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{rule.provider_id} — {rule.alert_type}</span>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={rule.is_active}
                onChange={e => handleSave(rule, 'is_active', e.target.checked)}
                disabled={savingId === rule.id}
                className="h-3.5 w-3.5"
              />
              Aktif
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Threshold</span>
              <input
                type="number"
                defaultValue={rule.threshold_value}
                onBlur={e => handleSave(rule, 'threshold_value', Number(e.target.value))}
                disabled={savingId === rule.id}
                className="rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Berturut (kali)</span>
              <input
                type="number"
                defaultValue={rule.consecutive_failures}
                onBlur={e => handleSave(rule, 'consecutive_failures', Number(e.target.value))}
                disabled={savingId === rule.id}
                className="rounded border px-2 py-1 text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Cooldown (menit)</span>
              <input
                type="number"
                defaultValue={rule.cooldown_minutes}
                onBlur={e => handleSave(rule, 'cooldown_minutes', Number(e.target.value))}
                disabled={savingId === rule.id}
                className="rounded border px-2 py-1 text-xs"
              />
            </label>
          </div>
          {savingId === rule.id && (
            <p className="mt-1.5 text-xs text-muted-foreground">Menyimpan...</p>
          )}
          {errors[rule.id] && (
            <p className="mt-1.5 text-xs text-red-500">{errors[rule.id]}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── L2RealtimePanel ─────────────────────────────────────────────────────────

export function L2RealtimePanel({ systems }: { systems: ProviderSnapshot[] }) {
  return (
    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground mb-1">Grafik realtime aktif via SSE</p>
      <p>Status L1 di atas diperbarui otomatis setiap kali data baru masuk dari cron. Grafik time-series tersedia setelah data historis terkumpul.</p>
      {systems.some(s => s.response_time_ms !== null) && (
        <div className="mt-3 flex flex-wrap gap-4">
          {systems.filter(s => s.response_time_ms !== null).map(s => (
            <div key={s.provider_id} className="text-xs">
              <span className="font-medium text-foreground">{s.nama}</span>
              <span className="ml-1">{s.response_time_ms}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── L3DeepPanel ──────────────────────────────────────────────────────────────

export function L3DeepPanel({ systems }: { systems: ProviderSnapshot[] }) {
  return (
    <div className="rounded-md border bg-muted/20 p-4 text-sm">
      <p className="text-muted-foreground mb-3">
        Data mendalam (DB connections, storage quota, CI/CD) dikumpulkan QStash tiap 15 menit.
        Konfigurasi token di <strong>Integrasi → API Provider</strong>.
      </p>
      {systems.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map(s => (
            <div key={s.provider_id} className="rounded border bg-background p-3 text-xs">
              <div className="font-medium mb-1">{s.nama}</div>
              <div className="text-muted-foreground">Kategori: {s.kategori}</div>
              <div className="text-muted-foreground mt-0.5">
                Uptime 24j: {s.uptime_24h_pct !== null ? `${s.uptime_24h_pct}%` : 'Menunggu data'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MonitoringConfigPanel (BARU T-032) ───────────────────────────────────────
// Thin wrapper di atas ConfigPageClient untuk 10 config_registry monitoring.
// SA bisa edit: threshold_response_ms, alert_consecutive_failures, cooldown_minutes,
// superadmin_alert_wa_number, superadmin_alert_email, data_retention_days, interval, dll.
// Save via /api/config/bulk + sp_bulk_update_config (atomic) — tidak ada API route baru.

export function MonitoringConfigPanel({
  initialData,
}: {
  initialData: ConfigGroup[]
}) {
  if (initialData.length === 0 || initialData[0].items.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
        Tidak ada konfigurasi monitoring yang tersedia.
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-background">
      <ConfigPageClient initialData={initialData} />
    </div>
  )
}
