// app/api/monitoring/metrics/route.ts
// GET — Snapshot status semua sistem + alert count (untuk L1 badge grid + L4 tabel)
// Dipanggil oleh: MonitoringClient.tsx saat halaman load + polling manual
// Dibuat: Sesi #153 — PL-S09 Step 3.5

import { NextResponse }          from 'next/server'
import { requireSuperAdmin }     from '@/lib/auth-server'
import { getMonitoringSnapshot } from '@/lib/services/monitoring.service'
import { getRecentAlertLogs }    from '@/lib/services/monitoring.service'

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  try {
    const [snapshot, alertLogs] = await Promise.all([
      getMonitoringSnapshot(),
      getRecentAlertLogs(20),
    ])

    return NextResponse.json({
      success:    true,
      systems:    snapshot.systems,
      alertCount: snapshot.alertCount,
      alertLogs,
      updatedAt:  snapshot.updatedAt,
    })
  } catch (err) {
    console.error('[GET /api/monitoring/metrics]', err)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data monitoring' },
      { status: 500 }
    )
  }
}
