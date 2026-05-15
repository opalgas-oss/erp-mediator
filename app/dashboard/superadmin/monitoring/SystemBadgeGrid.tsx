'use client'
// app/dashboard/superadmin/monitoring/SystemBadgeGrid.tsx
// L1 — Badge status per sistem (UP/DOWN/DEGRADED/UNKNOWN)
// Warna berubah real-time via SSE dari MonitoringClient
//
// Dibuat: Sesi #153 — PL-S09 Step 3.6

import type { ProviderSnapshot } from '@/lib/types/monitoring.types'

interface Props {
  systems: ProviderSnapshot[]
}

function statusConfig(status: string) {
  switch (status) {
    case 'UP':       return { dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200 text-emerald-800', label: 'UP' }
    case 'DOWN':     return { dot: 'bg-red-500',     badge: 'bg-red-50 border-red-200 text-red-800',             label: 'DOWN' }
    case 'DEGRADED': return { dot: 'bg-amber-500',   badge: 'bg-amber-50 border-amber-200 text-amber-800',       label: 'DEGRADED' }
    default:         return { dot: 'bg-slate-400',   badge: 'bg-slate-50 border-slate-200 text-slate-600',       label: 'UNKNOWN' }
  }
}

export function SystemBadgeGrid({ systems }: Props) {
  if (systems.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Belum ada data sistem. Pastikan QStash cron sudah aktif.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {systems.map(sys => {
        const cfg = statusConfig(sys.status)
        const ms  = sys.response_time_ms !== null ? ` · ${sys.response_time_ms}ms` : ''
        return (
          <div
            key={sys.provider_id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${cfg.badge}`}
            title={`${sys.nama} — ${sys.status}${ms}${sys.last_checked_at ? ` · ${new Date(sys.last_checked_at).toLocaleTimeString('id-ID')}` : ''}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {sys.nama}
            <span className="opacity-60">{cfg.label}{ms}</span>
          </div>
        )
      })}
    </div>
  )
}
