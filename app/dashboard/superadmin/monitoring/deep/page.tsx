// app/dashboard/superadmin/monitoring/deep/page.tsx
// M02 — Deep Metrics
// Route: /dashboard/superadmin/monitoring/deep
// Menampilkan: Data L3 mendalam per sistem (DB connections, bandwidth, error rate, dll)
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Pola: RSC fetch data via repository layer (TIDAK query DB langsung di page)
// File yang di-reuse: provider-metrics.repository.ts (findLatestMetricsPerProvider + findLatestL3MetricsPerProvider)
// Update S#297: tambah CapacityRow (progress bar + "terpakai / kapasitas (XX%)"), baca kapasitas
//   dari config_registry (policy_key capacity_*) — SA bisa ubah via dashboard Konfigurasi.
//   Supabase: db_size_bytes + storage_used_bytes sekarang terisi nyata via RPC monitoring.collect_metrics().
// Update S#299: Fix CapacityRow — bedakan null (N/A, tanpa bar) vs 0 (bar 0%, nol-asli).
//   Fix loadCapacityConfig — pakai getConfigItemsByKategori('Monitoring') (Opsi A),
//   sebelumnya getConfigPageItems('monitoring') → tidak pernah match capacity_* karena
//   masing-masing punya feature_key sendiri, bukan feature_key='monitoring'.

export const dynamic = 'force-dynamic'

import {
  findLatestMetricsPerProvider,
  findLatestL3MetricsPerProvider,
} from '@/lib/repositories/provider-metrics.repository'
import { getConfigItemsByKategori } from '@/lib/config-registry'
import type { ProviderSnapshot } from '@/lib/types/monitoring.types'
import { getHeartbeatStatus }  from '@/lib/services/alert-heartbeat.service'
import { HeartbeatBanner }     from '../HeartbeatBanner'

// ─── Tipe kapasitas ────────────────────────────────────────────────────────────

interface CapacityConfig {
  supabaseDbMb:           number
  supabaseStorageGb:      number
  supabaseConnections:    number
  vercelBandwidthGb:      number
  vercelFnInvocations:    number
  upstashMemoryMb:        number
  cloudinaryStorageGb:    number
  cloudinaryBandwidthGb:  number
  cloudinaryApiCalls:     number
}

// ─── Helper format ─────────────────────────────────────────────────────────────

function fmtBytes(bytes: unknown): string {
  const n = Number(bytes)
  if (bytes === null || bytes === undefined || isNaN(n)) return '—'
  if (n === 0) return '0 B'
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(2)} GB`
  if (n >= 1_048_576)     return `${(n / 1_048_576).toFixed(1)} MB`
  return `${Math.round(n / 1024)} KB`
}

function fmtNum(val: unknown, suffix = ''): string {
  const n = Number(val)
  if (val === undefined || val === null || isNaN(n)) return '—'
  return `${n.toLocaleString('id-ID')}${suffix}`
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
      <td className="px-4 py-2.5 text-sm text-muted-foreground">{label}</td>
      <td className={`px-4 py-2.5 text-sm font-medium text-right ${warn ? 'text-amber-600' : ''}`}>
        {value}
      </td>
    </tr>
  )
}

// ─── Sub-komponen: CapacityRow ────────────────────────────────────────────────
// Menampilkan: label | "terpakai / kapasitas (XX%)" + progress bar
// Warna: hijau <70%, kuning 70-89%, merah ≥90%
// ATURAN: used=null → N/A tanpa bar (data tidak tersedia)
//         used=number (termasuk 0) → bar 0% (nol-asli, data nyata)

function CapacityRow({
  label,
  used,
  maxVal,
  fmtUsed,
  fmtMax,
  naLabel,
}: {
  label:    string
  used:     number | null   // null = tidak tersedia (N/A); 0 = nol-asli (bar 0%)
  maxVal:   number          // kapasitas maksimal
  fmtUsed:  string          // teks terformat untuk used
  fmtMax:   string          // teks terformat untuk kapasitas
  naLabel?: string          // label N/A custom (misal 'N/A (Hobby)')
}) {
  // null = data tidak tersedia → tampil N/A tanpa bar
  if (used === null) {
    return (
      <tr className="border-b last:border-0">
        <td className="px-4 py-2.5 text-sm text-muted-foreground">{label}</td>
        <td className="px-4 py-2.5">
          <span className="text-sm text-muted-foreground">{naLabel ?? 'N/A'}</span>
        </td>
      </tr>
    )
  }

  // number (termasuk 0) = data nyata → tampil bar (0 = bar 0%)
  const pct      = maxVal > 0 ? Math.min(Math.round((used / maxVal) * 100), 100) : 0
  const isWarn   = pct >= 70 && pct < 90
  const isDanger = pct >= 90

  const barColor  = isDanger ? '#dc2626' : isWarn ? '#d97706' : '#16a34a'
  const textColor = isDanger ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-emerald-700'

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2.5 text-sm text-muted-foreground">{label}</td>
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-medium ${textColor}`}>
              {fmtUsed} / {fmtMax}
            </span>
            <span className={`text-xs font-semibold tabular-nums ${textColor}`}>
              {pct}%
            </span>
          </div>
          <div style={{ background: '#e5e7eb', borderRadius: 100, height: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: barColor,
              borderRadius: 100,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Sub-komponen: SystemPanel ────────────────────────────────────────────────

function SystemPanel({
  sys,
  metrics,
  cap,
}: {
  sys:     ProviderSnapshot
  metrics: Record<string, unknown> | undefined
  cap:     CapacityConfig
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

            {/* ── Supabase ── */}
            {kode === 'supabase' && <>
              <CapacityRow
                label="DB Active Connections"
                used={metrics.db_active_connections !== null && metrics.db_active_connections !== undefined ? Number(metrics.db_active_connections) : null}
                maxVal={cap.supabaseConnections}
                fmtUsed={`${Number(metrics.db_active_connections) || 0}`}
                fmtMax={`${cap.supabaseConnections}`}
              />
              <CapacityRow
                label="Ukuran DB"
                used={metrics.db_size_bytes !== null && metrics.db_size_bytes !== undefined ? Number(metrics.db_size_bytes) : null}
                maxVal={cap.supabaseDbMb * 1_048_576}
                fmtUsed={fmtBytes(metrics.db_size_bytes)}
                fmtMax={`${cap.supabaseDbMb} MB`}
              />
              <CapacityRow
                label="Storage Terpakai"
                used={metrics.storage_used_bytes !== null && metrics.storage_used_bytes !== undefined ? Number(metrics.storage_used_bytes) : null}
                maxVal={cap.supabaseStorageGb * 1_073_741_824}
                fmtUsed={fmtBytes(metrics.storage_used_bytes)}
                fmtMax={`${cap.supabaseStorageGb} GB`}
              />
              <MetricRow label="Auth Requests/menit"  value={fmtNum(metrics.auth_requests_per_min)} />
              <MetricRow label="Active Sessions"      value={fmtNum(metrics.active_sessions)} />
              <MetricRow label="Edge Fn Invocations"  value={fmtNum(metrics.edge_fn_invocations)} />
              <MetricRow label="Edge Fn Error Rate"   value={fmtPct(metrics.edge_fn_error_rate_pct)} warn={Number(metrics.edge_fn_error_rate_pct) > 5} />
            </>}

            {/* ── Vercel ── */}
            {kode === 'vercel' && <>
              <MetricRow label="Status Deploy Terakhir" value={String(metrics.last_deployment_status ?? '—')} />
              <MetricRow label="Durasi Build Terakhir"  value={fmtNum(metrics.last_deployment_duration, 's')} />
              <CapacityRow
                label="Bandwidth Bulan Ini"
                used={metrics.bandwidth_bytes !== null && metrics.bandwidth_bytes !== undefined ? Number(metrics.bandwidth_bytes) : null}
                maxVal={cap.vercelBandwidthGb * 1_073_741_824}
                fmtUsed={fmtBytes(metrics.bandwidth_bytes)}
                fmtMax={`${cap.vercelBandwidthGb} GB`}
                naLabel="N/A (Hobby)"
              />
              <CapacityRow
                label="Fn Invocations"
                used={metrics.fn_invocations !== null && metrics.fn_invocations !== undefined ? Number(metrics.fn_invocations) : null}
                maxVal={cap.vercelFnInvocations}
                fmtUsed={fmtNum(metrics.fn_invocations)}
                fmtMax={`${cap.vercelFnInvocations.toLocaleString('id-ID')}/hari`}
                naLabel="N/A (Hobby)"
              />
              <MetricRow label="Fn Error Rate"          value={fmtPct(metrics.fn_error_rate_pct)} warn={Number(metrics.fn_error_rate_pct) > 5} />
              <MetricRow label="Fn Duration p50 / p99"  value={`${fmtNum(metrics.fn_duration_p50_ms, 'ms')} / ${fmtNum(metrics.fn_duration_p99_ms, 'ms')}`} />
            </>}

            {/* ── Upstash Redis ── */}
            {(kode === 'upstash' || kode === 'redis') && <>
              <MetricRow label="Commands/detik" value={fmtNum(metrics.commands_per_second)} />
              <CapacityRow
                label="Memory Used"
                used={metrics.memory_used_bytes !== null && metrics.memory_used_bytes !== undefined ? Number(metrics.memory_used_bytes) : null}
                maxVal={cap.upstashMemoryMb * 1_048_576}
                fmtUsed={fmtBytes(metrics.memory_used_bytes)}
                fmtMax={`${cap.upstashMemoryMb} MB`}
              />
              <MetricRow label="Cache Hit Rate" value={fmtPct(metrics.cache_hit_rate_pct)} warn={Number(metrics.cache_hit_rate_pct) > 0 && Number(metrics.cache_hit_rate_pct) < 85} />
              <MetricRow label="Latency p99"    value={fmtNum(metrics.latency_p99_ms, 'ms')} />
            </>}

            {/* ── Cloudinary ── */}
            {kode === 'cloudinary' && <>
              <CapacityRow
                label="Storage"
                used={metrics.storage_used_bytes !== null && metrics.storage_used_bytes !== undefined ? Number(metrics.storage_used_bytes) : null}
                maxVal={cap.cloudinaryStorageGb * 1_073_741_824}
                fmtUsed={fmtBytes(metrics.storage_used_bytes)}
                fmtMax={`${cap.cloudinaryStorageGb} GB`}
              />
              <CapacityRow
                label="Bandwidth"
                used={metrics.bandwidth_used_bytes !== null && metrics.bandwidth_used_bytes !== undefined ? Number(metrics.bandwidth_used_bytes) : null}
                maxVal={cap.cloudinaryBandwidthGb * 1_073_741_824}
                fmtUsed={fmtBytes(metrics.bandwidth_used_bytes)}
                fmtMax={`${cap.cloudinaryBandwidthGb} GB`}
              />
              <CapacityRow
                label="API Calls/bulan"
                used={metrics.api_calls_used !== null && metrics.api_calls_used !== undefined ? Number(metrics.api_calls_used) : null}
                maxVal={cap.cloudinaryApiCalls}
                fmtUsed={fmtNum(metrics.api_calls_used)}
                fmtMax={`${cap.cloudinaryApiCalls.toLocaleString('id-ID')}`}
              />
            </>}

            {/* ── GitHub ── */}
            {kode === 'github' && <>
              <MetricRow label="Status Workflow Terakhir" value={String(metrics.last_workflow_status ?? '—')} />
              <MetricRow label="Durasi Workflow"          value={fmtNum(metrics.last_workflow_duration, 's')} />
              <MetricRow label="Open Pull Requests"       value={fmtNum(metrics.open_pull_requests)} />
              <MetricRow label="Last Commit At"           value={
                metrics.last_commit_at
                  ? new Date(String(metrics.last_commit_at)).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
                  : '—'
              } />
            </>}

            {/* ── Provider lain: tampil key-value generic ── */}
            {!['supabase','vercel','upstash','redis','cloudinary','github'].includes(kode) && (
              Object.entries(metrics)
                .filter(([k]) => !k.startsWith('_'))
                .map(([key, val]) => (
                  <MetricRow key={key} label={key} value={String(val ?? '—')} />
                ))
            )}

          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Helper: baca config capacity dari config_registry ───────────────────────
// Opsi A (S#299): pakai getConfigItemsByKategori('Monitoring') — ambil SEMUA item
// kategori Monitoring sekaligus, map by policy_key (DIKOREKSI S#434).
// Sebelumnya getConfigPageItems('monitoring') → tidak pernah match karena capacity_*
// masing-masing dulu punya feature_key sendiri (bukan 'monitoring').
// S#434 / #68 TEMUAN-KATALOG-NILAI-TANPA-PENJAGA: keadaan itu DIPERBAIKI di data —
// `feature_key` = nama GRUP, `policy_key` = nama ITEM, keduanya wajib terisi.
// Kunci map dipindah ke `policy_key` supaya tetap benar sesudah 38 baris dinormalisasi.
// Nilai kuncinya identik dengan sebelumnya, jadi 9 lookup di bawah tidak berubah.

async function loadCapacityConfig(): Promise<CapacityConfig> {
  const items = await getConfigItemsByKategori('Monitoring')
  const map: Record<string, number> = {}
  for (const item of items) {
    map[item.policy_key ?? item.feature_key] = Number(item.nilai) || 0
  }
  return {
    supabaseDbMb:          map['capacity_supabase_db_mb']          || 500,
    supabaseStorageGb:     map['capacity_supabase_storage_gb']     || 1,
    supabaseConnections:   map['capacity_supabase_connections']    || 60,
    vercelBandwidthGb:     map['capacity_vercel_bandwidth_gb']     || 100,
    vercelFnInvocations:   map['capacity_vercel_fn_invocations']   || 100000,
    upstashMemoryMb:       map['capacity_upstash_memory_mb']       || 256,
    cloudinaryStorageGb:   map['capacity_cloudinary_storage_gb']   || 25,
    cloudinaryBandwidthGb: map['capacity_cloudinary_bandwidth_gb'] || 25,
    cloudinaryApiCalls:    map['capacity_cloudinary_api_calls']    || 500000,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonitoringDeepPage() {
  try {
    const [systems, l3Data, cap, heartbeat] = await Promise.all([
      findLatestMetricsPerProvider(),
      findLatestL3MetricsPerProvider(),
      loadCapacityConfig(),
      // M7 (S#462, butir 2 K-462-1) — status denyut cron untuk halaman ini.
      // .catch() SENDIRI, pola identik dengan monitoring/status/page.tsx (S#461): gagal membaca
      // denyut TIDAK BOLEH menjatuhkan seluruh halaman ke blok catch di bawah, padahal sumber
      // data lain sehat. null = status denyut gagal dibaca ⇒ spanduk tidak dirender.
      getHeartbeatStatus().catch((err) => {
        console.warn('[MonitoringDeepPage] getHeartbeatStatus gagal:', err)
        return null
      }),
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
            Kapasitas dapat diubah di Konfigurasi → Monitoring.
          </p>
        </div>

        {/* M7 (S#462) — spanduk "pemantauan tidak berdenyut". Rumahnya SATU komponen bersama
            (../HeartbeatBanner), dipakai juga oleh Status & Health. Angka di halaman ini diisi
            cron YANG SAMA, jadi tanpa penanda ini SA membaca angka basi tanpa tahu. */}
        <HeartbeatBanner
          isStale={heartbeat?.isStale}
          minutesAgo={heartbeat?.minutesAgo}
          hoursAgo={heartbeat?.hoursAgo}
        />

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
                cap={cap}
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
