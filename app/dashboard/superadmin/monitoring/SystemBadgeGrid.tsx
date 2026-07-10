'use client'
// app/dashboard/superadmin/monitoring/SystemBadgeGrid.tsx
// L1 — Badge status per sistem (C1: grid status, C3: aksesibilitas, C4: bahasa manusia, C5: empty state)
//
// Dibuat: Sesi #153 — PL-S09 Step 3.6
// Update S#331: C1 (grid lampu lalu lintas) + C3 (warna + ikon + label — aksesibilitas)
//              + C4 (bahasa manusia) + C5 (empty state menenangkan)
//              + B1 (tombol kirim alert uji coba)
// Update S#349: B3 — tampilkan business_impact di badge DOWN/DEGRADED
//
// C3 — Aksesibilitas: WAJIB kombinasi warna + ikon + label teks (tidak cukup warna saja)
// ~8% pria buta warna — semua elemen visual pakai triple indicator.

import { useState }           from 'react'
import type { ProviderSnapshot } from '@/lib/types/monitoring.types'

interface Props {
  systems:       ProviderSnapshot[]
  lastCheckedAt: string | null   // C5: untuk empty state "terakhir dicek"
  isStale?:      boolean         // M7: banner cron mati
  hoursAgo?:     number | null   // M7: berapa jam cron mati
}

// C3 + C4: status → { warna, ikon SVG, label bahasa manusia }
function statusConfig(status: string) {
  switch (status) {
    case 'UP':
      return {
        dotColor:    'bg-emerald-500',
        badgeColor:  'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon:        '✓',  // checkmark — bisa dibaca tanpa warna
        label:       'Sehat',
        ariaLabel:   'Status: Sehat',
      }
    case 'DOWN':
      return {
        dotColor:    'bg-red-500',
        badgeColor:  'bg-red-50 border-red-200 text-red-800',
        icon:        '✕',  // X — bisa dibaca tanpa warna
        label:       'Bermasalah',
        ariaLabel:   'Status: Bermasalah',
      }
    case 'DEGRADED':
      return {
        dotColor:    'bg-amber-500',
        badgeColor:  'bg-amber-50 border-amber-200 text-amber-800',
        icon:        '⚠',  // warning — bisa dibaca tanpa warna
        label:       'Lambat',
        ariaLabel:   'Status: Lambat / Terdegradasi',
      }
    default:
      return {
        dotColor:    'bg-slate-400',
        badgeColor:  'bg-slate-50 border-slate-200 text-slate-600',
        icon:        '?',
        label:       'Tidak diketahui',
        ariaLabel:   'Status: Tidak diketahui',
      }
  }
}

export function SystemBadgeGrid({ systems, lastCheckedAt, isStale, hoursAgo }: Props) {
  const [testLoading, setTestLoading] = useState(false)
  const [testResult,  setTestResult]  = useState<string | null>(null)

  // B1 — Kirim alert uji coba
  async function handleTestAlert() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/monitoring/alert-test', { method: 'POST' })
      const data = await res.json()
      setTestResult(data.message ?? (res.ok ? 'Terkirim' : 'Gagal'))
    } catch {
      setTestResult('Gagal menghubungi server.')
    } finally {
      setTestLoading(false)
    }
  }

  // M7 — Banner cron mati
  const showStale = isStale && hoursAgo !== null && hoursAgo !== undefined

  // C5 — Empty state menenangkan (bukan layar kosong)
  if (systems.length === 0) {
    const lastCheckedStr = lastCheckedAt
      ? new Date(lastCheckedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      : null

    return (
      <div className="space-y-3">
        {showStale && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            ⚠ Sistem monitoring tidak aktif sejak {hoursAgo} jam lalu. Harap periksa cron job.
          </div>
        )}
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          <span className="font-medium">✓ Semua sistem sehat</span>
          {lastCheckedStr && (
            <span className="ml-1 opacity-70">— terakhir dicek {lastCheckedStr}</span>
          )}
        </div>
        <TestAlertButton loading={testLoading} result={testResult} onClick={handleTestAlert} />
      </div>
    )
  }

  const downCount      = systems.filter(s => s.status === 'DOWN').length
  const degradedCount  = systems.filter(s => s.status === 'DEGRADED').length
  const healthyCount   = systems.filter(s => s.status === 'UP').length

  return (
    <div className="space-y-4">
      {/* M7 — Banner cron mati */}
      {showStale && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          ⚠ Sistem monitoring tidak aktif sejak {hoursAgo} jam lalu. Harap periksa cron job.
        </div>
      )}

      {/* C5 — Summary baris atas */}
      <div className="text-sm text-muted-foreground">
        {downCount > 0 && (
          <span className="font-medium text-red-700 mr-2">✕ {downCount} bermasalah</span>
        )}
        {degradedCount > 0 && (
          <span className="font-medium text-amber-700 mr-2">⚠ {degradedCount} lambat</span>
        )}
        {healthyCount > 0 && (
          <span className="text-emerald-700 mr-2">✓ {healthyCount} sehat</span>
        )}
      </div>

      {/* C1 — Grid badge per provider (warna + ikon + label = C3) */}
      <div className="flex flex-wrap gap-2" role="list" aria-label="Status sistem">
        {systems.map(sys => {
          const cfg = statusConfig(sys.status)
          const ms  = sys.response_time_ms !== null ? ` · ${sys.response_time_ms}ms` : ''
          return (
            <div
              key={sys.provider_id}
              role="listitem"
              aria-label={`${sys.nama}: ${cfg.ariaLabel}${ms}`}
              className={`inline-flex flex-col gap-0.5 rounded-xl border px-3 py-1.5 text-xs font-medium ${cfg.badgeColor}`}
              title={`${sys.nama} — ${cfg.label}${ms}${sys.last_checked_at ? ` · ${new Date(sys.last_checked_at).toLocaleTimeString('id-ID')}` : ''}`}
            >
              {/* C3: dot warna + ikon teks + label — triple indicator */}
              <div className="inline-flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}`} aria-hidden="true" />
                <span aria-hidden="true">{cfg.icon}</span>
                <span>{sys.nama}</span>
                <span className="opacity-60">{cfg.label}{ms}</span>
              </div>
              {/* B3 S#349: dampak bisnis hanya tampil jika DOWN/DEGRADED dan ada teks */}
              {(sys.status === 'DOWN' || sys.status === 'DEGRADED') && sys.business_impact && (
                <p className="text-xs opacity-75 pl-3 leading-tight">⚠ {sys.business_impact}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* B1 — Tombol kirim alert uji coba */}
      <TestAlertButton loading={testLoading} result={testResult} onClick={handleTestAlert} />
    </div>
  )
}

// B1 — Komponen tombol test alert (dipakai di dua kondisi: empty + ada sistem)
function TestAlertButton({
  loading,
  result,
  onClick,
}: {
  loading: boolean
  result:  string | null
  onClick: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? '⏳ Mengirim...' : '🔔 Kirim Alert Uji Coba'}
      </button>
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
    </div>
  )
}
