'use client'
// app/dashboard/superadmin/monitoring/MonitoringClient.subcomponents.tsx
// Sub-komponen untuk MonitoringClient.tsx.
// Dipecah dari MonitoringClient.tsx S#164 karena file mencapai 15.7 KB (melebihi batas 10 KB ATURAN 9).
//
// Isi:
//   - SectionLabel          — heading section monitoring
//   - SummaryCard           — kartu ringkasan UP/Degraded/Down
//   - AlertRulesPanel       — panel edit alert_rules per provider (collapse toggle)
//   - MonitoringConfigPanel — panel edit config_registry monitoring (T-032)
//   - L2RealtimePanel       — grafik response time realtime (S#292: implementasi nyata)
//   - L3DeepPanel           — kartu deep metrics per provider
//
// PERUBAHAN S#292 — L2RealtimePanel: implementasi grafik SVG response time per provider.
//   Sebelumnya hanya teks placeholder. Sekarang tampil grafik line/bar dari data historis
//   + update realtime via SSE. Grafik tampil dari nol bahkan sebelum ada data.

import { useState, useEffect }  from 'react'
import { ConfigPageClient }     from '../settings/security-login/ConfigPageClient'
import type { AlertRule }       from '@/lib/types/monitoring.types'
import type { ProviderSnapshot } from '@/lib/types/monitoring.types'
import type { ConfigItemData }  from '@/components/ConfigItem'

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface ConfigGroup { title: string; feature_key: string; items: ConfigItemData[] }

interface MetricPoint {
  checked_at:      string
  response_time_ms: number | null
  status:          string
}

interface ProviderHistory {
  provider_id: string
  nama:        string
  data:        MetricPoint[]
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

// ─── MiniLineChart — grafik SVG per provider ──────────────────────────────────

function MiniLineChart({ data, nama, currentMs, status }: {
  data:      MetricPoint[]
  nama:      string
  currentMs: number | null
  status:    string
}) {
  const W = 200
  const H = 60
  const PAD = 4

  // Ambil 20 titik terakhir, isi dengan 0 jika kurang
  const points = Array.from({ length: 20 }, (_, i) => {
    const d = data[data.length - 20 + i]
    return d ? (d.response_time_ms ?? 0) : 0
  })

  const maxVal = Math.max(...points, 100) // minimal 100ms agar grafik tidak flat
  const stepX  = (W - PAD * 2) / (points.length - 1)

  const coords = points.map((v, i) => {
    const x = PAD + i * stepX
    const y = PAD + (H - PAD * 2) * (1 - v / maxVal)
    return { x, y, v }
  })

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${H - PAD} L ${PAD} ${H - PAD} Z`

  const statusColor = status === 'UP' ? '#10b981' : status === 'DEGRADED' ? '#f59e0b' : status === 'DOWN' ? '#ef4444' : '#9ca3af'
  const statusBg    = status === 'UP' ? 'bg-emerald-50 border-emerald-200' : status === 'DEGRADED' ? 'bg-amber-50 border-amber-200' : status === 'DOWN' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'

  return (
    <div className={`rounded-md border p-3 ${statusBg}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{nama}</span>
        <span className="text-xs font-semibold" style={{ color: statusColor }}>
          {status === 'UNKNOWN' ? '?' : status}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="overflow-visible">
        {/* Area */}
        <path d={areaD} fill={statusColor} fillOpacity={0.08} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={statusColor} strokeWidth={1.5} strokeLinejoin="round" />
        {/* Titik terakhir */}
        {coords.length > 0 && (
          <circle
            cx={coords[coords.length - 1].x}
            cy={coords[coords.length - 1].y}
            r={2.5}
            fill={statusColor}
          />
        )}
      </svg>
      <div className="text-xs text-muted-foreground mt-1 text-right">
        {currentMs !== null ? `${currentMs}ms` : '—'}
      </div>
    </div>
  )
}

// ─── L2RealtimePanel ──────────────────────────────────────────────────────────

export function L2RealtimePanel({ systems }: { systems: ProviderSnapshot[] }) {
  const [history,   setHistory]   = useState<ProviderHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data historis 30 menit terakhir
  useEffect(() => {
    async function fetchHistory() {
      try {
        const res  = await fetch('/api/monitoring/metrics/history?minutes=30')
        const data = await res.json()
        if (data.success) setHistory(data.history)
      } catch { /* silent */ } finally {
        setIsLoading(false)
      }
    }
    fetchHistory()
    // Refresh setiap 60 detik
    const interval = setInterval(fetchHistory, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Map provider_id ke data historis
  const historyMap = new Map(history.map(h => [h.provider_id, h]))

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Response Time — 30 Menit Terakhir</p>
        <p className="text-xs text-muted-foreground">Diperbarui otomatis via SSE · setiap menit</p>
      </div>
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Memuat data historis...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {systems.map(s => {
            const provHistory = historyMap.get(s.provider_id)
            return (
              <MiniLineChart
                key={s.provider_id}
                nama={s.nama}
                status={s.status}
                currentMs={s.response_time_ms}
                data={provHistory?.data ?? []}
              />
            )
          })}
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
              <input type="number" defaultValue={rule.threshold_value}
                onBlur={e => handleSave(rule, 'threshold_value', Number(e.target.value))}
                disabled={savingId === rule.id}
                className="rounded border px-2 py-1 text-xs" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Berturut (kali)</span>
              <input type="number" defaultValue={rule.consecutive_failures}
                onBlur={e => handleSave(rule, 'consecutive_failures', Number(e.target.value))}
                disabled={savingId === rule.id}
                className="rounded border px-2 py-1 text-xs" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Cooldown (menit)</span>
              <input type="number" defaultValue={rule.cooldown_minutes}
                onBlur={e => handleSave(rule, 'cooldown_minutes', Number(e.target.value))}
                disabled={savingId === rule.id}
                className="rounded border px-2 py-1 text-xs" />
            </label>
          </div>
          {savingId === rule.id && <p className="mt-1.5 text-xs text-muted-foreground">Menyimpan...</p>}
          {errors[rule.id]      && <p className="mt-1.5 text-xs text-red-500">{errors[rule.id]}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── MonitoringConfigPanel ────────────────────────────────────────────────────

export function MonitoringConfigPanel({ initialData }: { initialData: ConfigGroup[] }) {
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
