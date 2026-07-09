'use client'
// app/dashboard/superadmin/monitoring/MonitoringClient.subcomponents.tsx
// Sub-komponen untuk MonitoringClient.tsx.
// PERUBAHAN S#292 v3 — L2RealtimePanel sesuai mockup Mockup_M01_Status_Realtime.html:
//   - Card per provider (2 kolom), besar, dengan gridline + threshold line + area fill
//   - Tab: Response Time / Uptime % / Error Rate
//   - Mini table di bawah grafik: waktu, response, status, bar
//   - SSE dot animasi pulse

import { useState, useEffect }  from 'react'
import { ConfigPageClient }     from '../settings/security-login/ConfigPageClient'
import type { AlertRule, ProviderSnapshot } from '@/lib/types/monitoring.types'
import type { ConfigItemData }  from '@/components/ConfigItem'

interface ConfigGroup { title: string; feature_key: string; items: ConfigItemData[] }

interface MetricPoint {
  checked_at:       string
  response_time_ms: number | null
  status:           string
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

export function SummaryCard({ label, value, color }: {
  label: string; value: number; color: 'emerald' | 'amber' | 'red'
}) {
  const styles = {
    emerald: { card: 'border-[#97C459] bg-[#EAF3DE]', val: 'text-[#3B6D11]', lbl: 'text-[#3B6D11]' },
    amber:   { card: 'border-[#EF9F27] bg-[#FAEEDA]', val: 'text-[#854F0B]', lbl: 'text-[#854F0B]' },
    red:     { card: 'border-[#F09595] bg-[#FCEBEB]', val: 'text-[#A32D2D]', lbl: 'text-[#A32D2D]' },
  }
  const s = styles[color]
  return (
    <div className={`rounded-xl border p-[18px_20px] text-center ${s.card}`} style={{ borderWidth: '0.5px' }}>
      <div className={`text-3xl font-bold leading-none ${s.val}`}>{value}</div>
      <div className={`text-xs mt-1.5 font-medium ${s.lbl}`}>{label}</div>
    </div>
  )
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const s = status === 'UP' ? 'bg-[#EAF3DE] text-[#3B6D11]'
          : status === 'DEGRADED' ? 'bg-[#FAEEDA] text-[#854F0B]'
          : status === 'DOWN' ? 'bg-[#FCEBEB] text-[#A32D2D]'
          : 'bg-[#F1EFE8] text-[#5F5E5A]'
  return (
    <span className={`inline-flex px-[7px] py-[1px] rounded-full text-[10px] font-medium ${s}`}>
      {status}
    </span>
  )
}

// ─── ProviderChart — card besar per provider sesuai mockup ────────────────────

function ProviderChart({ provider, history, tab }: {
  provider: ProviderSnapshot
  history:  MetricPoint[]
  tab:      'response' | 'uptime' | 'error'
}) {
  const W = 300
  const H = 100
  const THRESHOLD_Y = 8  // garis merah threshold ~3000ms

  // Ambil 60 titik terakhir (60 menit)
  const points = Array.from({ length: 60 }, (_, i) => {
    const d = history[history.length - 60 + i]
    return d ? (d.response_time_ms ?? 0) : 0
  })

  const maxVal = Math.max(...points, 500)
  const stepX  = W / (points.length - 1)

  const coords = points.map((v, i) => ({
    x: i * stepX,
    y: 10 + (H - 20) * (1 - Math.min(v / maxVal, 1)),
    v,
  }))

  const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const areaD = `${lineD} L ${coords[coords.length - 1].x.toFixed(1)} ${H} L 0 ${H} Z`

  const color     = provider.status === 'UP' ? '#3B6D11' : provider.status === 'DEGRADED' ? '#854F0B' : provider.status === 'DOWN' ? '#A32D2D' : '#9ca3af'
  const areaColor = provider.status === 'UP' ? 'rgba(59,109,17,0.09)' : provider.status === 'DEGRADED' ? 'rgba(133,79,11,0.09)' : provider.status === 'DOWN' ? 'rgba(163,45,45,0.09)' : 'rgba(156,163,175,0.09)'

  // Avg response time dari titik yang ada
  const validPoints = points.filter(v => v > 0)
  const avg = validPoints.length > 0 ? Math.round(validPoints.reduce((a, b) => a + b, 0) / validPoints.length) : null

  // 3 data terakhir untuk mini table
  const lastThree = history.slice(-3).reverse()

  if (tab !== 'response') {
    return (
      <div className="bg-white rounded-xl border border-black/10 p-8 text-center text-[#9ca3af] text-sm">
        Data {tab === 'uptime' ? 'uptime %' : 'error rate'} tersedia setelah 24 jam data terkumpul.
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl overflow-hidden ${provider.status === 'UNKNOWN' || provider.status === 'DOWN' ? 'opacity-80' : ''}`}
      style={{ border: '0.5px solid rgba(0,0,0,0.12)' }}>
      {/* Header */}
      <div className="px-4 py-3.5 flex items-start justify-between" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
        <div>
          <div className="text-[13px] font-semibold text-[#1a1a1a]">Response Time — {provider.nama}</div>
          <div className="text-[11px] text-[#9ca3af] mt-0.5">
            60 menit terakhir{avg !== null ? ` · avg ${avg}ms` : ''}
          </div>
        </div>
        <StatusPill status={provider.status} />
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4">
        {/* SVG Chart */}
        <div style={{ height: H }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
            {/* Gridlines */}
            <line x1="0" y1="25" x2={W} y2="25" stroke="#f1f0ed" strokeWidth="1"/>
            <line x1="0" y1="55" x2={W} y2="55" stroke="#f1f0ed" strokeWidth="1"/>
            <line x1="0" y1="85" x2={W} y2="85" stroke="#f1f0ed" strokeWidth="1"/>
            {/* Threshold line */}
            <line x1="0" y1={THRESHOLD_Y} x2={W} y2={THRESHOLD_Y} stroke="#F09595" strokeWidth="0.8" strokeDasharray="5,4"/>
            {/* Area */}
            <path d={areaD} fill={areaColor}/>
            {/* Line */}
            <polyline points={coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')}
              fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Time labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#9ca3af]">60m lalu</span>
          <span className="text-[10px] text-[#9ca3af]">sekarang</span>
        </div>

        {/* Mini table */}
        {lastThree.length > 0 && (
          <table className="w-full border-collapse text-xs mt-3">
            <thead>
              <tr>
                {['Waktu','Response','Status','Bar'].map(h => (
                  <th key={h} className="px-2 py-1.5 text-left text-[11px] font-medium text-[#6b7280]"
                    style={{ background: '#f9f9f8', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lastThree.map((m, i) => {
                const ms = m.response_time_ms ?? 0
                const pct = Math.min(Math.round((ms / 3000) * 100), 100)
                const barColor = ms < 2000 ? '#3B6D11' : '#854F0B'
                const time = new Date(m.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
                return (
                  <tr key={i} style={{ borderBottom: i < lastThree.length - 1 ? '0.5px solid rgba(0,0,0,0.08)' : 'none' }}>
                    <td className="px-2 py-1.5 text-[#9ca3af]">{time}</td>
                    <td className="px-2 py-1.5 font-semibold">{ms > 0 ? `${ms}ms` : '—'}</td>
                    <td className="px-2 py-1.5"><StatusPill status={m.status} /></td>
                    <td className="px-2 py-1.5">
                      <div className="w-[80px] h-[5px] rounded-full overflow-hidden bg-[#f1f0ed]">
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 9999 }}/>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {lastThree.length === 0 && (
          <div className="mt-3 text-[12px] text-[#9ca3af] text-center py-2">
            Menunggu data dari cron...
          </div>
        )}
      </div>
    </div>
  )
}

// ─── L2RealtimePanel ──────────────────────────────────────────────────────────

export function L2RealtimePanel({ systems }: { systems: ProviderSnapshot[] }) {
  const [history,   setHistory]   = useState<ProviderHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab,       setTab]       = useState<'response' | 'uptime' | 'error'>('response')

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res  = await fetch('/api/monitoring/metrics/history?minutes=60')
        const data = await res.json()
        if (data.success) setHistory(data.history)
      } catch { /* silent */ } finally {
        setIsLoading(false)
      }
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 60_000)
    return () => clearInterval(interval)
  }, [])

  const historyMap = new Map(history.map(h => [h.provider_id, h]))

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b mb-3.5" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
        {(['response', 'uptime', 'error'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[13px] border-b-2 transition-colors whitespace-nowrap font-normal
              ${tab === t ? 'text-[#185FA5] border-[#185FA5] font-medium' : 'text-[#6b7280] border-transparent hover:text-[#1a1a1a]'}`}>
            {t === 'response' ? 'Response Time' : t === 'uptime' ? 'Uptime %' : 'Error Rate'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-8 text-center">Memuat data historis...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systems.map(s => (
            <ProviderChart
              key={s.provider_id}
              provider={s}
              history={historyMap.get(s.provider_id)?.data ?? []}
              tab={tab}
            />
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

// ─── AlertRulesPanel — DIPINDAH ke alert-rules/AlertRulesPanel.tsx (M5 S#340) ─
// Import dari file baru untuk backward compatibility sementara (dihapus setelah
// semua consumer diupdate ke import langsung dari './alert-rules/AlertRulesPanel')

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
