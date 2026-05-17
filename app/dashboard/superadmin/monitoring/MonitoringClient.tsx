'use client'
// app/dashboard/superadmin/monitoring/MonitoringClient.tsx
// Orchestrator halaman Monitoring Dashboard.
// Mengelola: state sistem, SSE connection, polling, toggle panel.
//
// Dibuat: Sesi #153 — PL-S09 Step 3.6
// Update S#164 — T-032: pecah ke subcomponents + tambah MonitoringConfigPanel

import { useState, useEffect, useCallback, useRef } from 'react'
import { ICON_ACTION, ICON_STATUS }                  from '@/lib/constants/icons.constant'
import { SystemBadgeGrid }                           from './SystemBadgeGrid'
import { UptimeSummaryTable, AlertLogTable }         from './UptimeSummaryTable'
import {
  SectionLabel,
  SummaryCard,
  AlertRulesPanel,
  MonitoringConfigPanel,
  L2RealtimePanel,
  L3DeepPanel,
} from './MonitoringClient.subcomponents'
import type {
  ProviderSnapshot,
  AlertLog,
  AlertRule,
  MetricSSEEvent,
} from '@/lib/types/monitoring.types'
import type { ConfigItemData } from '@/components/ConfigItem'

interface ConfigGroup { title: string; feature_key: string; items: ConfigItemData[] }

interface Props {
  initialSystems:          ProviderSnapshot[]
  initialAlertCount:       number
  initialAlertLogs:        AlertLog[]
  initialAlertRules:       AlertRule[]
  initialUpdatedAt:        string
  initialMonitoringConfig: ConfigGroup[]
}

export function MonitoringClient({
  initialSystems, initialAlertCount, initialAlertLogs,
  initialAlertRules, initialUpdatedAt, initialMonitoringConfig,
}: Props) {
  const [systems,    setSystems]    = useState<ProviderSnapshot[]>(initialSystems)
  const [alertCount, setAlertCount] = useState(initialAlertCount)
  const [alertLogs,  setAlertLogs]  = useState<AlertLog[]>(initialAlertLogs)
  const [alertRules, setAlertRules] = useState<AlertRule[]>(initialAlertRules)
  const [updatedAt,  setUpdatedAt]  = useState(initialUpdatedAt)
  const [sseStatus,  setSseStatus]  = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [showRules,  setShowRules]  = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const eventSourceRef              = useRef<EventSource | null>(null)
  void alertCount

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) eventSourceRef.current.close()
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

  const countUp       = systems.filter(s => s.status === 'UP').length
  const countDegraded = systems.filter(s => s.status === 'DEGRADED').length
  const countDown     = systems.filter(s => s.status === 'DOWN').length
  const RefreshIcon   = ICON_ACTION.refresh
  const LoadingIcon   = ICON_STATUS.loading
  const ResetIcon     = ICON_ACTION.reset

  const sseClass = sseStatus === 'connected' ? 'text-emerald-600' : sseStatus === 'error' ? 'text-red-500' : 'text-amber-500'
  const sseLabel = sseStatus === 'connected' ? 'Realtime aktif' : sseStatus === 'error' ? 'SSE error — retry 30s' : 'Menghubungkan...'

  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Monitoring Platform</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update terakhir: {new Date(updatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
            {' · '}<span className={sseClass}>● {sseLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={isRefreshing} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-50">
            {isRefreshing ? <LoadingIcon size={14} className="animate-spin" /> : <RefreshIcon size={14} />}
            Refresh
          </button>
          <button onClick={() => setShowRules(r => !r)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50">
            <ResetIcon size={14} />{showRules ? 'Tutup Alert Rules' : 'Alert Rules'}
          </button>
          <button onClick={() => setShowConfig(c => !c)} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50">
            <ResetIcon size={14} />{showConfig ? 'Tutup Konfigurasi' : 'Konfigurasi Platform'}
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Sistem UP"    value={countUp}       color="emerald" />
        <SummaryCard label="Degraded"     value={countDegraded} color="amber"   />
        <SummaryCard label="Down / Alert" value={countDown}     color="red"     />
      </div>

      {/* L1 */}
      <section>
        <SectionLabel>L1 — Status Sistem (Ping Health)</SectionLabel>
        <SystemBadgeGrid systems={systems} />
      </section>

      {/* L2 */}
      <section>
        <SectionLabel>L2 — Realtime Monitor</SectionLabel>
        <L2RealtimePanel systems={systems} />
      </section>

      {/* L3 */}
      <section>
        <SectionLabel>L3 — Deep Monitoring (setiap 15 menit)</SectionLabel>
        <L3DeepPanel systems={systems} />
      </section>

      {/* L4 */}
      <section>
        <SectionLabel>L4 — Ringkasan Uptime</SectionLabel>
        <UptimeSummaryTable systems={systems} />
      </section>

      {/* L5: Alert Log */}
      <section>
        <SectionLabel>L5 — Riwayat Alert ({alertLogs.length} terakhir)</SectionLabel>
        <AlertLogTable alertLogs={alertLogs} />
      </section>

      {/* Alert Rules (collapsible) */}
      {showRules && (
        <section>
          <SectionLabel>Pengaturan Alert Rules</SectionLabel>
          <AlertRulesPanel rules={alertRules} onUpdate={setAlertRules} />
        </section>
      )}

      {/* Konfigurasi Platform (collapsible) — T-032 */}
      {showConfig && (
        <section>
          <SectionLabel>Konfigurasi Platform Monitoring</SectionLabel>
          <p className="mb-3 text-xs text-muted-foreground">
            Ubah threshold alert, interval cron, retensi data, dan nomor WA/email penerima alert.
            Disimpan via config_registry — berlaku untuk semua provider.
          </p>
          <MonitoringConfigPanel initialData={initialMonitoringConfig} />
        </section>
      )}

    </div>
  )
}
