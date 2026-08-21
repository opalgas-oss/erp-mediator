// app/dashboard/superadmin/monitoring/alerts/page.tsx
// M04 — Riwayat Alert
// Route: /dashboard/superadmin/monitoring/alerts
// Menampilkan: Log semua alert yang dikirim ke WA/Email + status pengiriman
//
// Dibuat: Sesi #283 — LANGKAH 1 Monitoring Pages
// PERUBAHAN Sesi #294 — Langkah 4: tambah state ke-3 "dilewati" (—) di channelBadge.
// PERUBAHAN Sesi #295 — FIX gagalCount: sebelumnya hitung log "dilewati" sebagai gagal.
//   Sekarang: gagal = ada error_wa ATAU error_email (bukan hanya sent=false).
//   Tambah kolom "Dilewati" di statistik untuk transparansi.
//
// Pola: RSC fetch via repository layer (TIDAK query DB langsung di page)
// File yang di-reuse:
//   - findRecentAlertLogs (alert-log.repository.ts) — TIDAK buat fungsi duplikat
//   - getPastISOTimestamp (date.utils.ts) — sesuai SL-D006, tidak inline new Date()

export const dynamic = 'force-dynamic'

import { findRecentAlertLogs } from '@/lib/repositories/alert-log.repository'
import { getPastISOTimestamp } from '@/lib/utils/date.utils'
import type { AlertLog }       from '@/lib/types/monitoring.types'
import { getHeartbeatStatus }  from '@/lib/services/alert-heartbeat.service'
import { HeartbeatBanner }     from '../HeartbeatBanner'

// ─── Hitung statistik dari logs ───────────────────────────────────────────────

/**
 * 3 kategori yang benar:
 *   sukses   = minimal 1 channel terkirim (sent_via_wa || sent_via_email)
 *   gagal    = ada error di minimal 1 channel (error_wa || error_email) — bukan sekadar sent=false
 *   dilewati = tidak ada yang terkirim DAN tidak ada error (penerima belum dikonfigurasi saat alert terjadi)
 *
 * FIX Sesi #295: gagalCount sebelumnya = !sent_via_wa && !sent_via_email
 *   → ikut sertakan log "dilewati" sebagai "gagal" — salah.
 */
function computeStats(logs: AlertLog[]) {
  const since1d = getPastISOTimestamp(24,     'hours')
  const since7d = getPastISOTimestamp(7 * 24, 'hours')

  const alertsToday  = logs.filter(l => l.triggered_at >= since1d).length
  const alerts7d     = logs.filter(l => l.triggered_at >= since7d).length
  const suksesCount  = logs.filter(l => l.sent_via_wa || l.sent_via_email).length
  const gagalCount   = logs.filter(l => !!(l.error_wa || l.error_email)).length
  const dilewatiCount = logs.filter(
    l => !l.sent_via_wa && !l.sent_via_email && !l.error_wa && !l.error_email
  ).length

  return { alertsToday, alerts7d, suksesCount, gagalCount, dilewatiCount }
}

// ─── Badge status kirim per channel ──────────────────────────────────────────

/**
 * 3 state visual:
 *   sukses  → hijau ✓  (sent_via_* = true)
 *   gagal   → merah ✗  (sent_via_* = false DAN ada error_*) — hover untuk lihat error
 *   netral  → abu  —   (sent_via_* = false DAN tidak ada error_* = penerima kosong / dilewati)
 */
function channelBadge(
  label:    string,
  sent:     boolean,
  errorMsg: string | null | undefined
): { cls: string; icon: string; title: string } {
  if (sent) {
    return {
      cls:   label === 'WA' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
      icon:  '✓',
      title: 'Terkirim',
    }
  }
  if (errorMsg) {
    return {
      cls:   'bg-red-100 text-red-800',
      icon:  '✗',
      title: `Gagal: ${errorMsg}`,
    }
  }
  return {
    cls:   'bg-slate-100 text-slate-500',
    icon:  '—',
    title: 'Tidak dikonfigurasi / dilewati',
  }
}

// ─── Badge warna alert type ───────────────────────────────────────────────────

function alertTypeBadge(type: string): string {
  const map: Record<string, string> = {
    DOWN:            'bg-red-100 text-red-800',
    SLOW:            'bg-amber-100 text-amber-800',
    HIGH_ERROR_RATE: 'bg-orange-100 text-orange-800',
    QUOTA_WARNING:   'bg-blue-100 text-blue-800',
  }
  return map[type] ?? 'bg-slate-100 text-slate-600'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MonitoringAlertsPage() {
  try {
    const [logs, heartbeat] = await Promise.all([
      findRecentAlertLogs(100),
      // M7 (S#462, butir 2 K-462-1) — status denyut cron untuk halaman ini.
      // .catch() SENDIRI, pola identik dengan monitoring/status/page.tsx (S#461): gagal membaca
      // denyut TIDAK BOLEH menjatuhkan seluruh halaman ke blok catch di bawah, padahal sumber
      // data lain sehat. null = status denyut gagal dibaca ⇒ spanduk tidak dirender.
      getHeartbeatStatus().catch((err) => {
        console.warn('[MonitoringAlertsPage] getHeartbeatStatus gagal:', err)
        return null
      }),
    ])
    const stats = computeStats(logs)

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <p className="mt-1 text-[12px] text-[#6b7280]">
            Log semua notifikasi yang dikirim ke WA dan Email beserta status pengirimannya.
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

        {/* Statistik Header — 5 kolom */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: 'Alert Hari Ini',   value: stats.alertsToday,   color: 'text-foreground' },
            { label: 'Alert 7 Hari',     value: stats.alerts7d,      color: 'text-foreground' },
            { label: 'Terkirim Sukses',  value: stats.suksesCount,   color: 'text-emerald-600' },
            { label: 'Gagal Kirim',      value: stats.gagalCount,    color: 'text-red-600' },
            { label: 'Dilewati',         value: stats.dilewatiCount, color: 'text-slate-500' },
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
                        {log.notif_channels.includes('WA') && (() => {
                          const b = channelBadge('WA', log.sent_via_wa, log.error_wa)
                          return (
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-medium cursor-default ${b.cls}`}
                              title={b.title}
                            >
                              WA {b.icon}
                            </span>
                          )
                        })()}
                        {log.notif_channels.includes('EMAIL') && (() => {
                          const b = channelBadge('EMAIL', log.sent_via_email, log.error_email)
                          return (
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-medium cursor-default ${b.cls}`}
                              title={b.title}
                            >
                              Email {b.icon}
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    <td
                      className="px-4 py-2.5 text-xs text-muted-foreground max-w-[280px] truncate"
                      title={log.message}
                    >
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Keterangan status:{' '}
          <span className="text-emerald-700 font-medium">✓ Terkirim</span> ·{' '}
          <span className="text-red-700 font-medium">✗ Gagal kirim (hover untuk detail error)</span> ·{' '}
          <span className="text-slate-500 font-medium">— Tidak dikonfigurasi / dilewati</span>.{' '}
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
