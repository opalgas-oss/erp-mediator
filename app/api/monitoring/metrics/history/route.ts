// app/api/monitoring/metrics/history/route.ts
// GET — Data historis response time per provider untuk grafik L2
// Query param: ?minutes=60 (default 60 menit)
// Dipanggil oleh: L2RealtimePanel (client component) via fetch() dari browser
// PERUBAHAN S#292: ganti requireSuperAdmin() → requireSuperAdminCookie()
//   karena dipanggil client-side, header middleware tidak tersedia

import { NextRequest, NextResponse }    from 'next/server'
import { requireSuperAdminCookie }      from '@/lib/auth-server'
import { createServerSupabaseClient }   from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  // DIAGNOSTIK S#292 — hapus setelah selesai
  console.log('[history-diag] x-is-super-admin header:', req.headers.get('x-is-super-admin'))
  console.log('[history-diag] x-user-id header:', req.headers.get('x-user-id'))
  console.log('[history-diag] cookie ada:', req.headers.get('cookie') ? 'YA' : 'TIDAK')

  const auth = await requireSuperAdminCookie()
  if (!auth.ok) {
    console.log('[history-diag] requireSuperAdminCookie GAGAL')
    return auth.res
  }

  const minutes  = Number(req.nextUrl.searchParams.get('minutes') ?? '60')
  const supabase = createServerSupabaseClient()

  try {
    const { data: providers, error: provErr } = await supabase
      .from('service_providers')
      .select('id, nama')
      .eq('is_aktif', true)
      .order('nama')

    if (provErr) throw provErr

    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()
    const { data: metrics, error: metErr } = await supabase
      .from('provider_metrics')
      .select('provider_id, response_time_ms, status, checked_at')
      .eq('layer', 'L1')
      .gte('checked_at', since)
      .order('checked_at', { ascending: true })

    if (metErr) throw metErr

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
