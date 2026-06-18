// app/api/monitoring/metrics/history/route.ts
// GET — Data historis response time per provider untuk grafik L2
// Query param: ?minutes=30 (default 30 menit)
// Dipanggil oleh: L2RealtimePanel di MonitoringClient.subcomponents.tsx
// Dibuat: Sesi #292 — implementasi grafik L2 nyata

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }         from '@/lib/auth-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  const minutes = Number(req.nextUrl.searchParams.get('minutes') ?? '30')
  const supabase = createServerSupabaseClient()

  try {
    // Ambil semua provider aktif
    const { data: providers, error: provErr } = await supabase
      .from('service_providers')
      .select('id, nama')
      .eq('is_aktif', true)
      .order('nama')

    if (provErr) throw provErr

    // Ambil metrics historis dalam window waktu yang diminta
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()
    const { data: metrics, error: metErr } = await supabase
      .from('provider_metrics')
      .select('provider_id, response_time_ms, status, checked_at')
      .eq('layer', 'L1')
      .gte('checked_at', since)
      .order('checked_at', { ascending: true })

    if (metErr) throw metErr

    // Group metrics per provider
    const history = (providers ?? []).map(p => ({
      provider_id: p.id,
      nama:        p.nama,
      data:        (metrics ?? [])
        .filter(m => m.provider_id === p.id)
        .map(m => ({
          checked_at:       m.checked_at,
          response_time_ms: m.response_time_ms,
          status:           m.status,
        })),
    }))

    return NextResponse.json({ success: true, history })
  } catch (err) {
    console.error('[GET /api/monitoring/metrics/history]', err)
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data historis' },
      { status: 500 }
    )
  }
}
