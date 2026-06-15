// app/dashboard/superadmin/monitoring/deep/page.tsx
// M02 — Deep Metrics
// Route: /dashboard/superadmin/monitoring/deep
// Menampilkan: Data L3 mendalam per sistem (DB connections, bandwidth, error rate, dll)
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Pola: RSC fetch data via repository layer (TIDAK query DB langsung di page)
// File yang di-reuse: provider-metrics.repository.ts (findLatestMetricsPerProvider + findLatestL3MetricsPerProvider)

export const dynamic = 'force-dynamic'

import {
  findLatestMetricsPerProvider,
  findLatestL3MetricsPerProvider,
} from '@/lib/repositories/provider-metrics.repository'
import type { ProviderSnapshot } from '@/lib/types/monitoring.types'

// ─── Helper format ────────────────────────────────────────────────────────────

function fmtBytes(bytes: unknown): string {
  const n = Number(bytes)
  if (!bytes || isNaN(n)) return '—'
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`
  if (n >= 1_048_576)     return `${(n / 1_048_576).toFixed(1)} MB`
  return `${Math.round(n / 1024)} KB`
}

function fmtNum(val: unknown, suffix = ''): string {
  const n = Number(val)
  if (val === undefined || val === null || isNaN(n)) return '—'
  return `${n}${suffix}`
}

function fmtPct(val: unknown): string {
  const n = Number(val)
  if (val === undefined || val === null || isNaN(n)) return '—'
  return `${n}%`
}

// ─── Sub-komponen: MetricRow ──────────────────────────────────────────────────

function MetricRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2 text-sm text-muted-foreground">{label}</td>
      <td className={`px-4 py-2 text-sm font-medium text-right ${warn ? 'text-amber-600' : ''}`}>
        {value}
      </td>
    </tr>
  )
}

// ─── Sub-komponen: SystemPanel ────────────────────────────────────────────────

function SystemPanel({
  sys,
  metrics,
}: {
  sys:     ProviderSnapshot
  metrics: Record<string, unknown> | undefined
}) {
  const hasData = !!metrics && Object.keys(metrics).length > 0
  const kode    = sys.kode.toLowerCase()

  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
        <span className="text-sm font-semibold">{sys.nama}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
          sys.status === 'UP'       ? 'bg-emerald-100 text-emerald-800' :
          sys.status === 'DEGRADED' ? 'bg-amber-100 text-amber-800' :
          sys.status === 'DOWN'     ? 'bg-red-100 text-red-800' :
                                      'bg-slate-100 text-slate-600'
        }`}>{sys.status}</span>
      </div>

      {!hasData ? (
        <div className="px-4 py-4 text-sm text-muted-foreground italic">
          Data L3 belum tersedia — token Management API belum dikonfigurasi atau cron L3 belum berjalan.
        </div>
      ) : (
        <table className="w-full">
          <tbody>
            {/* Supabase */}
            {kode === 'supabase' && <>
              <MetricRow label="DB Active Connections" value={`${fmtNum(metrics.db_active_connections)} / ${fmtNum(metrics.db_max_connections)}`} warn={Number(metrics.db_active_connections) / Number(metrics.db_max_connections) > 0.8} />
              <MetricRow label="Ukuran DB"             value={fmtBytes(metrics.db_size_bytes)} />
              <MetricRow label="Storage Terpakai"      value={fmtBytes(metrics.storage_used_bytes)} />
              <MetricRow label="Auth Requests/menit"   value={fmtNum(metrics.auth_requests_per_min)} />
              <MetricRow label="Active Sessions"       value={fmtNum(metrics.active_sessions)} />
              <MetricRow label="Edge Fn Invocations"   value={fmtNum(metrics.edge_fn_invocations)} />
              <MetricRow label="Edge Fn Error Rate"    value={fmtPct(metrics.edge_fn_error_rate_pct)} warn={Number(metrics.edge_fn_error_rate_pct) > 5} />
            </>}

            {/* Vercel */}
            {kode === 'vercel' && <>
              <MetricRow label="Status Deploy Terakhir"  value={String(metrics.last_deployment_status ?? '—')} />
              <MetricRow label="Durasi Build Terakhir"   value={fmtNum(metrics.last_deployment_duration, 's')} />
              <MetricRow label="Bandwidth Bulan Ini"     value={fmtBytes(metrics.bandwidth_bytes)} warn={Number(metrics.bandwidth_bytes) > 8_589_934_592} />
              <MetricRow label="Fn Invocations"          value={fmtNum(metrics.fn_invocations)} />
              <MetricRow label="Fn Error Rate"           value={fmtPct(metrics.fn_error_rate_pct)} warn={Number(metrics.fn_error_rate_pct) > 5} />
              <MetricRow label="Fn Duration p50 / p99"   value={`${fmtNum(metrics.fn_duration_p50_ms, 'ms')} / ${fmtNum(metrics.fn_duration_p99_ms, 'ms')}`} />
            </>}

            {/* Upstash Redis */}
            {(kode === 'upstash' || kode === 'redis') && <>
              <MetricRow label="Commands/detik"   value={fmtNum(metrics.commands_per_second)} />
              <MetricRow label="Memory Used"      value={`${fmtBytes(metrics.memory_used_bytes)} / ${fmtBytes(metrics.memory_max_bytes)}`} warn={Number(metrics.memory_used_bytes) / Number(metrics.memory_max_bytes) > 0.85} />
              <MetricRow label="Cache Hit Rate"   value={fmtPct(metrics.cache_hit_rate_pct)} warn={Number(metrics.cache_hit_rate_pct) < 85} />
              <MetricRow label="Latency p99"      value={fmtNum(metrics.latency_p99_ms, 'ms')} />
            </>}

            {/* Cloudinary */}
            {kode === 'cloudinary' && <>
              <MetricRow label="Storage"          value={`${fmtBytes(metrics.storage_used_bytes)} / ${fmtBytes(metrics.storage_max_bytes)}`} warn={Number(metrics.storage_used_bytes) / Number(metrics.storage_max_bytes) > 0.8} />
              <MetricRow label="Bandwidth"        value={`${fmtBytes(metrics.bandwidth_bytes)} / ${fmtBytes(metrics.bandwidth_max_bytes)}`} warn={Number(metrics.bandwidth_bytes) / Number(metrics.bandwidth_max_bytes) > 0.8} />
              <MetricRow label="API Calls"        value={`${fmtNum(metrics.api_calls)} / ${fmtNum(metrics.api_calls_max)}`} />
            </>}

            {/* GitHub */}
            {kode === 'github' && <>
              <MetricRow label="Status Workflow Terakhir"  value={String(metrics.last_workflow_status ?? '—')} />
              <MetricRow label="Durasi Workflow"           value={fmtNum(metrics.last_workflow_duration, 's')} />
              <MetricRow label="Open Pull Requests"        value={fmtNum(metrics.open_pull_requests)} />
              <MetricRow label="Last Commit At"            value={metrics.last_commit_at ? new Date(String(metrics.last_commit_at)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—'} />
            </>}

            {/* Provider lain: tampil key-value generic */}
            {!['supabase','vercel','upstash','redis','cloudinary','github'].includes(kode) && (
              Object.entries(metrics).map(([key, val]) => (
                <MetricRow key={key} label={key} value={String(val ?? '—')} />
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonitoringDeepPage() {
  try {
    const [systems, l3Data] = await Promise.all([
      findLatestMetricsPerProvider(),
      findLatestL3MetricsPerProvider(),
    ])

    const knownL3 = ['supabase', 'vercel', 'upstash', 'redis', 'cloudinary', 'github']
    const l3Systems = (systems as ProviderSnapshot[]).filter(s =>
      knownL3.includes(s.kode.toLowerCase()) || !!l3Data[s.provider_id]
    )

    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Deep Metrics</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            Data L3 diambil via Management API setiap 15 menit. Token dikonfigurasi di Integrasi → API Provider.
          </p>
        </div>

        {l3Systems.length === 0 ? (
          <div className="rounded-md border border-muted p-6 text-center text-sm text-muted-foreground">
            Belum ada data L3. Pastikan cron QStash deep-metrics sudah berjalan dan token Management API sudah dikonfigurasi.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {l3Systems.map(sys => (
              <SystemPanel
                key={sys.provider_id}
                sys={sys}
                metrics={l3Data[sys.provider_id]}
              />
            ))}
          </div>
        )}
      </div>
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data deep metrics. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
