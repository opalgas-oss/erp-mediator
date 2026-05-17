'use client'
// app/dashboard/superadmin/monitoring/MonitoringClient.tsx
// PRE-EDIT SNAPSHOT — Sesi #164 T-032
// Kondisi: file 15.7 KB (melampaui batas 10 KB ATURAN 9)
// Akan dipecah: orchestrator + subcomponents + tambah MonitoringConfigPanel

import { useState, useEffect, useCallback, useRef } from 'react'
import { ICON_ACTION, ICON_STATUS } from '@/lib/constants/icons.constant'
import { SystemBadgeGrid }                    from './SystemBadgeGrid'
import { UptimeSummaryTable, AlertLogTable }  from './UptimeSummaryTable'
import type {
  ProviderSnapshot,
  AlertLog,
  AlertRule,
  MetricSSEEvent,
} from '@/lib/types/monitoring.types'

interface Props {
  initialSystems:    ProviderSnapshot[]
  initialAlertCount: number
  initialAlertLogs:  AlertLog[]
  initialAlertRules: AlertRule[]
  initialUpdatedAt:  string
}

export function MonitoringClient({
  initialSystems,
  initialAlertCount,
  initialAlertLogs,
  initialAlertRules,
  initialUpdatedAt,
}: Props) {
  const [systems,    setSystems]    = useState<ProviderSnapshot[]>(initialSystems)
  const [alertCount, setAlertCount] = useState(initialAlertCount)
  const [alertLogs,  setAlertLogs]  = useState<AlertLog[]>(initialAlertLogs)
  const [alertRules, setAlertRules] = useState<AlertRule[]>(initialAlertRules)
  const [updatedAt,  setUpdatedAt]  = useState(initialUpdatedAt)
  const [sseStatus,  setSseStatus]  = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [showRules,  setShowRules]  = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  void alertCount

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) { eventSourceRef.current.close() }
    const es = new EventSource('/api/monitoring/stream')
    eventSourceRef.current = es
    es.onopen = () => setSseStatus('connected')
    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as MetricSSEEvent
        if (event.type === 'heartbeat') return
        if (event.type === 'metric_update' && event.provider_id) {
          setSystems(prev => prev.map(sys =>
            sys.provider_id === event.provider_id
              ? { ...sys, status: event.status ?? sys.status, response_time_ms: event.response_time_ms ?? sys.response_time_ms, last_checked_at: event.checked_at ?? sys.last_checked_at }
              : sys
          ))
          setUpdatedAt(new Date().toISOString())
        }
      } catch { /* abaikan */ }
    }
    es.onerror = () => { setSseStatus('error'); es.close(); setTimeout(connectSSE, 30_000) }
  }, [])

  useEffect(() => { connectSSE(); return () => { eventSourceRef.current?.close() } }, [connectSSE])

  const [isRefreshing, setIsRefreshing] = useState(false)
  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/monitoring/metrics')
      const data = await res.json()
      if (data.success) { setSystems(data.systems); setAlertCount(data.alertCount); setAlertLogs(data.alertLogs); setUpdatedAt(data.updatedAt) }
    } catch { /* silent */ } finally { setIsRefreshing(false) }
  }

  const countUp = systems.filter(s => s.status === 'UP').length
  const countDegraded = systems.filter(s => s.status === 'DEGRADED').length
  const countDown = systems.filter(s => s.status === 'DOWN').length
  const RefreshIcon = ICON_ACTION.refresh
  const LoadingIcon = ICON_STATUS.loading
  const ResetIcon   = ICON_ACTION.reset

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Monitoring Platform</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update terakhir: {new Date(updatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
            {' · '}
            <span className={sseStatus === 'connected' ? 'text-emerald-600' : sseStatus === 'error' ? 'text-red-500' : 'text-amber-500'}>
              ● {sseStatus === 'connected' ? 'Realtime aktif' : sseStatus === 'error' ? 'SSE error — retry 30s' : 'Menghubungkan...'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={isRefreshing} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-50">
            {isRefreshing ? <LoadingIcon size={14} className="animate-spin" /> : <RefreshIcon size={14} />}
            Refresh
          </button>
          <button onClick={() => setShowRules(r => !r)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50">
            <ResetIcon size={14} />
            {showRules ? 'Tutup Pengaturan Alert' : 'Pengaturan Alert'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Sistem UP"    value={countUp}       color="emerald" />
        <SummaryCard label="Degraded"     value={countDegraded} color="amber"   />
        <SummaryCard label="Down / Alert" value={countDown}     color="red"     />
      </div>
      <section><SectionLabel>L1 — Status Sistem</SectionLabel><SystemBadgeGrid systems={systems} /></section>
      <section>
        <SectionLabel>L4 — Ringkasan Uptime</SectionLabel>
        <UptimeSummaryTable systems={systems} />
      </section>
      <section>
        <SectionLabel>L5 — Riwayat Alert ({alertLogs.length} terakhir)</SectionLabel>
        <AlertLogTable alertLogs={alertLogs} />
      </section>
      {showRules && (
        <section>
          <SectionLabel>L5 — Pengaturan Alert Rules</SectionLabel>
          <AlertRulesPanel rules={alertRules} onUpdate={setAlertRules} />
        </section>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: 'emerald' | 'amber' | 'red' }) {
  const colors = { emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900', amber: 'border-amber-200 bg-amber-50 text-amber-900', red: 'border-red-200 bg-red-50 text-red-900' }
  return <div className={`rounded-md border p-3 text-center ${colors[color]}`}><div className="text-2xl font-bold">{value}</div><div className="text-xs mt-0.5 opacity-70">{label}</div></div>
}

interface AlertRulesPanelProps { rules: AlertRule[]; onUpdate: (updater: (prev: AlertRule[]) => AlertRule[]) => void }
function AlertRulesPanel({ rules, onUpdate }: AlertRulesPanelProps) {
  const [savingId, setSavingId] = useState<string | null>(null)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  async function handleSave(rule: AlertRule, field: keyof AlertRule, value: unknown) {
    setSavingId(rule.id); setErrors(e => ({ ...e, [rule.id]: '' }))
    try {
      const res = await fetch(`/api/monitoring/alert-rules/${rule.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) })
      const data = await res.json()
      if (data.success) { onUpdate((prev: AlertRule[]) => prev.map(r => r.id === rule.id ? data.data : r)) }
      else { setErrors(e => ({ ...e, [rule.id]: data.message })) }
    } catch { setErrors(e => ({ ...e, [rule.id]: 'Gagal menyimpan' })) } finally { setSavingId(null) }
  }
  if (rules.length === 0) return <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">Belum ada alert rules. Rules dibuat otomatis saat cron pertama kali berjalan.</div>
  return (
    <div className="space-y-2">
      {rules.map(rule => (
        <div key={rule.id} className="rounded-md border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">{rule.provider_id} — {rule.alert_type}</span>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={rule.is_active} onChange={e => handleSave(rule, 'is_active', e.target.checked)} disabled={savingId === rule.id} className="h-3.5 w-3.5" />
              Aktif
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Threshold</span><input type="number" defaultValue={rule.threshold_value} onBlur={e => handleSave(rule, 'threshold_value', Number(e.target.value))} disabled={savingId === rule.id} className="rounded border px-2 py-1 text-xs" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Berturut (kali)</span><input type="number" defaultValue={rule.consecutive_failures} onBlur={e => handleSave(rule, 'consecutive_failures', Number(e.target.value))} disabled={savingId === rule.id} className="rounded border px-2 py-1 text-xs" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs text-muted-foreground">Cooldown (menit)</span><input type="number" defaultValue={rule.cooldown_minutes} onBlur={e => handleSave(rule, 'cooldown_minutes', Number(e.target.value))} disabled={savingId === rule.id} className="rounded border px-2 py-1 text-xs" /></label>
          </div>
          {savingId === rule.id && <p className="mt-1.5 text-xs text-muted-foreground">Menyimpan...</p>}
          {errors[rule.id]    && <p className="mt-1.5 text-xs text-red-500">{errors[rule.id]}</p>}
        </div>
      ))}
    </div>
  )
}
