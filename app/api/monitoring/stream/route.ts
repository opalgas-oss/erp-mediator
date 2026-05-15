// app/api/monitoring/stream/route.ts
// GET — SSE endpoint untuk realtime chart L2
// Client subscribe → server kirim event setiap ada data baru dari provider_metrics
// Polling interval: cek DB setiap 10 detik, kirim hanya kalau ada data baru sejak terakhir
// Dibuat: Sesi #153 — PL-S09 Step 3.5

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin }          from '@/lib/auth-server'
import { findSinceTimestamp }         from '@/lib/repositories/provider-metrics.repository'
import type { MetricSSEEvent }        from '@/lib/types/monitoring.types'

// Interval antar poll DB (ms) — tidak terlalu agresif untuk hemat koneksi DB
const POLL_INTERVAL_MS  = 10_000
// Heartbeat setiap N poll agar koneksi tidak di-timeout reverse proxy
const HEARTBEAT_EVERY   = 6      // = 60 detik

export async function GET(req: NextRequest) {
  // Auth check — SSE tetap butuh auth SuperAdmin
  const auth = await requireSuperAdmin()
  if (!auth.ok) return auth.res

  // Encoder untuk stream teks
  const encoder = new TextEncoder()

  // Timestamp mulai — hanya kirim data yang lebih baru dari koneksi dibuat
  let lastCheckedAt = new Date().toISOString()
  let pollCount     = 0

  const stream = new ReadableStream({
    async start(controller) {
      // Fungsi helper kirim event SSE
      function send(event: MetricSSEEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      // Loop polling selama koneksi aktif
      async function poll() {
        try {
          // Cek apakah client sudah disconnect
          if (req.signal.aborted) {
            controller.close()
            return
          }

          pollCount++

          // Heartbeat untuk mencegah timeout reverse proxy
          if (pollCount % HEARTBEAT_EVERY === 0) {
            send({ type: 'heartbeat' })
          }

          // Ambil data baru sejak lastCheckedAt
          const newMetrics = await findSinceTimestamp(lastCheckedAt)

          if (newMetrics.length > 0) {
            // Update cursor
            lastCheckedAt = newMetrics[newMetrics.length - 1].checked_at

            // Kirim satu event per metric baru
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

          // Schedule poll berikutnya
          setTimeout(poll, POLL_INTERVAL_MS)
        } catch (err) {
          console.error('[SSE /api/monitoring/stream] poll error:', err)
          // Jangan close stream saat error poll — coba lagi di interval berikutnya
          setTimeout(poll, POLL_INTERVAL_MS)
        }
      }

      // Mulai polling
      setTimeout(poll, POLL_INTERVAL_MS)

      // Cleanup saat client disconnect
      req.signal.addEventListener('abort', () => {
        controller.close()
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache',
      'Connection':                  'keep-alive',
      'X-Accel-Buffering':           'no',    // disable nginx buffering
    },
  })
}
