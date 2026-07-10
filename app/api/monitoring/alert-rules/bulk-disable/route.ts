// app/api/monitoring/alert-rules/bulk-disable/route.ts
// POST — Nonaktifkan semua alert rules milik provider yang tidak aktif (M9 Guardrail)
// Dipanggil oleh: AlertRulesPanel → tombol "Bersihkan Aturan Usang"
// Dibuat: Sesi #343 — M9 Guardrail Aksi Destruktif

import { NextResponse }                  from 'next/server'
import { requireSuperAdmin }             from '@/lib/auth-server'
import { bulkDisableStaleAlertRules }    from '@/lib/services/monitoring.service'

export async function POST() {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  try {
    const count = await bulkDisableStaleAlertRules(auth.uid)
    return NextResponse.json({ success: true, count })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal membersihkan aturan usang'
    console.error('[POST /api/monitoring/alert-rules/bulk-disable]', err)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
