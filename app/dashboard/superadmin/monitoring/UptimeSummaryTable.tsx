'use client'
// app/dashboard/superadmin/monitoring/UptimeSummaryTable.tsx
// L4 — Tabel rangkuman uptime per sistem
// L5 — Tabel riwayat alert (10 terakhir)
//
// Dibuat: Sesi #153 — PL-S09 Step 3.6

import type { ProviderSnapshot, AlertLog } from '@/lib/types/monitoring.types'

// ─── L4: Uptime Summary ───────────────────────────────────────────────────────

interface UptimeTableProps {
  systems: ProviderSnapshot[]
}

function uptimeColor(pct: number | null) {
  if (pct === null) return 'text-muted-foreground'
  if (pct >= 99)    return 'text-emerald-600 font-medium'
  if (pct >= 95)    return 'text-amber-600 font-medium'
  return 'text-red-600 font-medium'
}

export function UptimeSummaryTable({ systems }: UptimeTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[180px]" />
          <col className="w-[120px]" />
          <col className="w-[100px]" />
          <col className="w-[100px]" />
          <col className="w-[120px]" />
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Sistem</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Uptime 24j</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Uptime 7h</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Resp. Terakhir</th>
          </tr>
        </thead>
        <tbody>
          {systems.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">
                Belum ada data. Jalankan cron collect-metrics terlebih dahulu.
              </td>
            </tr>
          ) : (
            systems.map(sys => (
              <tr key={sys.provider_id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium">{sys.nama}</td>
                <td className="px-4 py-2.5">
                  <StatusChip status={sys.status} />
                </td>
                <td className={`px-4 py-2.5 text-right ${uptimeColor(sys.uptime_24h_pct)}`}>
                  {sys.uptime_24h_pct !== null ? `${sys.uptime_24h_pct}%` : '—'}
                </td>
                <td className={`px-4 py-2.5 text-right ${uptimeColor(sys.uptime_7d_pct)}`}>
                  {sys.uptime_7d_pct !== null ? `${sys.uptime_7d_pct}%` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">
                  {sys.response_time_ms !== null ? `${sys.response_time_ms}ms` : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    UP:       'bg-emerald-100 text-emerald-800',
    DOWN:     'bg-red-100 text-red-800',
    DEGRADED: 'bg-amber-100 text-amber-800',
    UNKNOWN:  'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status] ?? map['UNKNOWN']}`}>
      {status}
    </span>
  )
}

// ─── L5: Alert Log ────────────────────────────────────────────────────────────

interface AlertLogProps {
  alertLogs: AlertLog[]
}

export function AlertLogTable({ alertLogs }: AlertLogProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[160px]" />
          <col className="w-[140px]" />
          <col className="w-[120px]" />
          <col className="w-[100px]" />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Waktu</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Provider</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tipe Alert</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Channel</th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Pesan</th>
          </tr>
        </thead>
        <tbody>
          {alertLogs.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-sm">
                Belum ada riwayat alert.
              </td>
            </tr>
          ) : (
            alertLogs.map(log => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.triggered_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                </td>
                <td className="px-4 py-2.5 font-medium truncate">{log.provider_id}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">
                    {log.alert_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {log.notif_channels.join(', ')}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground truncate" title={log.message}>
                  {log.message.slice(0, 80)}{log.message.length > 80 ? '…' : ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
