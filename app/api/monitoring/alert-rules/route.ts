// app/api/monitoring/alert-rules/route.ts
// GET — List semua alert rules untuk form pengaturan threshold di L5
// Dipanggil oleh: AlertSettingsDialog.tsx
// Dibuat: Sesi #153 — PL-S09 Step 3.5

import { NextResponse }      from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-server'
import { getAlertRules }     from '@/lib/services/monitoring.service'

export async function GET() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  try {
    const rules = await getAlertRules()
    return NextResponse.json({ success: true, data: rules })
  } catch (err) {
    console.error('[GET /api/monitoring/alert-rules]', err)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil alert rules' },
      { status: 500 }
    )
  }
}
