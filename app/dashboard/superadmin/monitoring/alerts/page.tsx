// app/dashboard/superadmin/monitoring/alerts/page.tsx
// M04 — Riwayat Alert
// Route: /dashboard/superadmin/monitoring/alerts
// Menampilkan: Log semua alert yang dikirim ke WA/Email + status pengiriman
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// Pola: RSC fetch via repository layer (TIDAK query DB langsung di page)
// File yang di-reuse:
//   - findRecentAlertLogs (alert-log.repository.ts) — TIDAK buat fungsi duplikat
//   - getPastISOTimestamp (date.utils.ts) — sesuai SL-D006, tidak inline new Date()

export const dynamic = 'force-dynamic'

import { findRecentAlertLogs }  from '@/lib/repositories/alert-log.repository'
import { getPastISOTimestamp }  from '@/lib/utils/date.utils'
import type { AlertLog }        from '@/lib/types/monitoring.types'

// ─── Hitung statistik dari logs ───────────────────────────────────────────────

function computeStats(logs: AlertLog[]) {
  const since1d = getPastISOTimestamp(24,       'hours')
  const since7d = getPastISOTimestamp(7 * 24,   'hours')

  const alertsToday = logs.filter(l => l.triggered_at >= since1d).length
  const alerts7d    = logs.filter(l => l.triggered_at >= since7d).length
  const suksesCount = logs.filter(l => l.sent_via_wa || l.sent_via_email).length
  const gagalCount  = logs.filter(l => !l.sent_via_wa && !l.sent_via_email).length

  return { alertsToday, alerts7d, suksesCount, gagalCount }
}

// ─── Badge warna alert type ───────────────────────────────────────────────────

function alertTypeBadge(type: string): string {
  const map: Record<string, string> = {
    DOWN:             'bg-red-100 text-red-800',
    SLOW:             'bg-amber-100 text-amber-800',
    HIGH_ERROR_RATE:  'bg-orange-100 text-orange-800',
    QUOTA_WARNING:    'bg-blue-100 text-blue-800',
  }
  return map[type] ?? 'bg-slate-100 text-slate-600'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonitoringAlertsPage() {
  try {
    // Reuse findRecentAlertLogs dari alert-log.repository — tidak duplikasi query
    const logs  = await findRecentAlertLogs(100)
    const stats = computeStats(logs)

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a1a1a]">Riwayat Alert</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            Log semua notifikasi yang dikirim ke WA dan Email beserta status pengirimannya.
          </p>
        </div>

        {/* Statistik Header */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Alert Hari Ini',  value: stats.alertsToday, color: 'text-foreground' },
            { label: 'Alert 7 Hari',    value: stats.alerts7d,    color: 'text-foreground' },
            { label: 'Terkirim Sukses', value: stats.suksesCount, color: 'text-emerald-600' },
            { label: 'Gagal Kirim',     value: stats.gagalCount,  color: 'text-red-600' },
          ].map(stat => (
            <div key={stat.label} className="rounded-md border bg-muted/20 px-4 py-3">
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Tabel Log */}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">Waktu</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Provider</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Tipe Alert</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Channel</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status Kirim</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Pesan</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada riwayat alert.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.triggered_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{log.provider_id}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${alertTypeBadge(log.alert_type)}`}>
                        {log.alert_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {log.notif_channels.join(', ')}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {log.notif_channels.includes('WA') && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${log.sent_via_wa ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
                            title={log.error_wa ?? undefined}
                          >
                            WA {log.sent_via_wa ? '✓' : '✗'}
                          </span>
                        )}
                        {log.notif_channels.includes('EMAIL') && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${log.sent_via_email ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}
                            title={log.error_email ?? undefined}
                          >
                            Email {log.sent_via_email ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[280px] truncate" title={log.message}>
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Catatan: Jika SMTP DOWN, notifikasi email tidak bisa dikirim. Jika Fonnte DOWN, notifikasi WA tidak bisa dikirim.
          Semua kegagalan dicatat di log ini meskipun SA tidak menerima notifikasi.
        </p>
      </div>
    )
  } catch {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat riwayat alert. Silakan refresh halaman.
        </div>
      </div>
    )
  }
}
