// ARSIP — app/dashboard/superadmin/monitoring/alerts/page.tsx
// Snapshot pra-fix Sesi #295
// Bug: gagalCount salah hitung — ikut sertakan log "dilewati" (sent=false, error=null)
// sebagai "gagal kirim". Seharusnya gagal = ada error_wa atau error_email.
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

function computeStats(logs: AlertLog[]) {
  const since1d = getPastISOTimestamp(24,       'hours')
  const since7d = getPastISOTimestamp(7 * 24,   'hours')

  const alertsToday = logs.filter(l => l.triggered_at >= since1d).length
  const alerts7d    = logs.filter(l => l.triggered_at >= since7d).length
  const suksesCount = logs.filter(l => l.sent_via_wa || l.sent_via_email).length
  const gagalCount  = logs.filter(l => !l.sent_via_wa && !l.sent_via_email).length // BUG: ikut sertakan "dilewati"

  return { alertsToday, alerts7d, suksesCount, gagalCount }
}
