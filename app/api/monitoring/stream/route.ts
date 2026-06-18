// app/api/monitoring/stream/route.ts
// GET — SSE endpoint untuk realtime update L2 monitoring
// PERUBAHAN S#292: ganti verifikasi manual → requireSuperAdminCookie() (DRY)
// Dibuat: Sesi #153 — PL-S09 Step 3.5

import { NextRequest, NextResponse }  from 'next/server'
import { requireSuperAdminCookie }    from '@/lib/auth-server'
import { findSinceTimestamp }         from '@/lib/repositories/provider-metrics.repository'
import type { MetricSSEEvent }        from '@/lib/types/monitoring.types'

const POLL_INTERVAL_MS = 10_000
const HEARTBEAT_EVERY  = 6

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdminCookie()
  if (!auth.ok) return auth.res

  const encoder     = new TextEncoder()
  let lastCheckedAt = new Date().toISOString()
  let pollCount     = 0

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: MetricSSEEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      async function poll() {
        try {
          if (req.signal.aborted) { controller.close(); return }
          pollCount++
          if (pollCount % HEARTBEAT_EVERY === 0) send({ type: 'heartbeat' })

          const newMetrics = await findSinceTimestamp(lastCheckedAt)
          if (newMetrics.length > 0) {
            lastCheckedAt = newMetrics[newMetrics.length - 1].checked_at
            for (const m of newMetrics) {
              send({
                type:             'metric_update',
                provider_id:      m.provider_id,
                status:           m.status,
                response_time_ms: m.response_time_ms,
                checked_at:       m.checked_at,
              })
            }
          }
          setTimeout(poll, POLL_INTERVAL_MS)
        } catch (err) {
          console.error('[SSE /api/monitoring/stream] poll error:', err)
          setTimeout(poll, POLL_INTERVAL_MS)
        }
      }

      setTimeout(poll, POLL_INTERVAL_MS)
      req.signal.addEventListener('abort', () => { controller.close() })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
