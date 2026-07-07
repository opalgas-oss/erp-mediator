// app/api/monitoring/alerts/route.ts
// GET — List alert logs dengan status lifecycle (M1)
// Dipakai oleh: halaman /dashboard/superadmin/monitoring/alerts
// Dibuat: Sesi #331 — FASE 1 Alert Monitoring

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import { findRecentAlertLogs }       from '@/lib/repositories/alert-log.repository'

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  const { searchParams } = req.nextUrl
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

  try {
    const logs = await findRecentAlertLogs(limit)
    return NextResponse.json({ success: true, data: logs, total: logs.length })
  } catch (err) {
    console.error('[GET /api/monitoring/alerts]', err)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil alert log' },
      { status: 500 }
    )
  }
}
