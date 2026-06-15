// app/dashboard/superadmin/monitoring/uptime/page.tsx
// M03 — Laporan Uptime
// Route: /dashboard/superadmin/monitoring/uptime
// Menampilkan: Health score, tabel uptime semua sistem (24j/7h/30h)
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Pola: RSC fetch via repository layer (TIDAK query DB langsung di page)
// File yang di-reuse: provider-metrics.repository.ts

export const dynamic = 'force-dynamic'

import {
  findLatestMetricsPerProvider,
  computeUptimePct,
  findDailyStatusByProvider,
} from '@/lib/repositories/provider-metrics.repository'
import type { ProviderSnapshot } from '@/lib/types/monitoring.types'

// ─── Tipe lokal untuk baris tabel ────────────────────────────────────────────

interface UptimeRow extends ProviderSnapshot {
  uptime_30d_pct: number | null
  daily_7d:       Array<'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'>
}

// ─── Helper warna ─────────────────────────────────────────────────────────────

function uptimeClass(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground'
  if (pct >= 99)   return 'text-emerald-600 font-medium'
  if (pct >= 95)   return 'text-amber-600 font-medium'
  return 'text-red-600 font-medium'
}

function dailyDotClass(status: string): string {
  switch (status) {
    case 'UP':       return 'bg-emerald-500'
    case 'DEGRADED': return 'bg-amber-400'
    case 'DOWN':     return 'bg-red-500'
    default:         return 'bg-slate-300'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonitoringUptimePage() {
  try {
    const systems = await findLatestMetricsPerProvider() as ProviderSnapshot[]

    // Enrich: uptime 24h, 7d, 30d + daily_7d — semua via repository layer
    const rows: UptimeRow[] = await Promise.all(
      systems.map(async sys => {
        const [u24h, u7d, u30d, daily7d] = await Promise.all([
          computeUptimePct(sys.provider_id, 24),
          computeUptimePct(sys.provider_id, 168),
          computeUptimePct(sys.provider_id, 720),
          findDailyStatusByProvider(sys.provider_id),
        ])
        return {
          ...sys,
          uptime_24h_pct: u24h,
          uptime_7d_pct:  u7d,
          uptime_30d_pct: u30d,
          daily_7d:       daily7d,
        }
      })
    )

    // Health Score: rata-rata uptime 24h sistem yang bukan UNKNOWN
    const known     = rows.filter(r => r.uptime_24h_pct !== null)
    const healthPct = known.length > 0
      ? Math.round(known.reduce((acc, r) => acc + (r.uptime_24h_pct ?? 0), 0) / known.length * 10) / 10
      : null

    const countUp       = rows.filter(r => r.status === 'UP').length
    const countDegraded = rows.filter(r => r.status === 'DEGRADED').length
    const countDown     = rows.filter(r => r.status === 'DOWN').length
    const countUnknown  = rows.filter(r => r.status === 'UNKNOWN').length

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Laporan Uptime</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            Ringkasan ketersediaan semua sistem yang dimonitor.
          </p>
        </div>

        {/* Health Score Strip */}
        <div className="flex flex-wrap items-center gap-6 rounded-md border bg-muted/30 px-5 py-4">
          <div>
            <div className="text-xs text-muted-foreground">Platform Health Score</div>
            <div className={`text-2xl font-bold ${
              healthPct === null   ? 'text-muted-foreground' :
              healthPct >= 99      ? 'text-emerald-600' :
              healthPct >= 95      ? 'text-amber-600' :
                                     'text-red-600'
            }`}>
              {healthPct !== null ? `${healthPct}%` : '—'}
            </div>
            <div className="text-[10px] text-muted-foreground">Avg uptime 24 jam (UNKNOWN dikecualikan)</div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-600">↑ UP: {countUp}</span>
            <span className="text-amber-600">~ Degraded: {countDegraded}</span>
            <span className="text-red-600">↓ Down: {countDown}</span>
            <span className="text-slate-500">? Unknown: {countUnknown}</span>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Sistem</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Kategori</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">7 Hari</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Uptime 24j</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Uptime 7h</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Uptime 30h</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Resp. Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada data. Jalankan cron collect-metrics terlebih dahulu.
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.provider_id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{row.nama}</td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">{row.kategori}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        row.status === 'UP'       ? 'bg-emerald-100 text-emerald-800' :
                        row.status === 'DEGRADED' ? 'bg-amber-100 text-amber-800' :
                        row.status === 'DOWN'     ? 'bg-red-100 text-red-800' :
                                                    'bg-slate-100 text-slate-600'
                      }`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-0.5">
                        {row.daily_7d.map((s, i) => (
                          <div
                            key={i}
                            className={`h-4 w-3.5 rounded-sm ${dailyDotClass(s)}`}
                            title={`Hari -${6 - i}: ${s}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className={`px-4 py-2.5 text-right ${uptimeClass(row.uptime_24h_pct)}`}>
                      {row.uptime_24h_pct !== null ? `${row.uptime_24h_pct}%` : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${uptimeClass(row.uptime_7d_pct)}`}>
                      {row.uptime_7d_pct !== null ? `${row.uptime_7d_pct}%` : '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${uptimeClass(row.uptime_30d_pct)}`}>
                      {row.uptime_30d_pct !== null ? `${row.uptime_30d_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {row.response_time_ms !== null ? `${row.response_time_ms}ms` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Health Score = rata-rata uptime 24 jam semua sistem yang sudah punya data (UNKNOWN dikecualikan).
          Data diperbarui setiap 1 menit via cron QStash. Retensi data: 30 hari.
        </p>
      </div>
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat laporan uptime. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
