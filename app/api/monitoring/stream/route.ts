// app/api/monitoring/stream/route.ts
// GET — SSE endpoint untuk realtime update L2 monitoring
// PERUBAHAN S#292: ganti requireSuperAdmin() ke verifikasi cookie Supabase langsung
//   Root cause SSE 403: requireSuperAdmin() bergantung pada header x-is-super-admin
//   dari middleware, yang tidak reliable untuk long-lived SSE connections.
//   Fix: verifikasi session Supabase via cookie langsung + cek app_metadata.app_role
//
// Dibuat: Sesi #153 — PL-S09 Step 3.5

import { NextRequest, NextResponse } from 'next/server'
import { cookies }                   from 'next/headers'
import { createServerClient }        from '@supabase/ssr'
import { findSinceTimestamp }        from '@/lib/repositories/provider-metrics.repository'
import type { MetricSSEEvent }       from '@/lib/types/monitoring.types'

const POLL_INTERVAL_MS = 10_000
const HEARTBEAT_EVERY  = 6  // heartbeat setiap 60 detik

// ─── Verifikasi SuperAdmin via cookie (khusus SSE) ────────────────────────────
// Tidak pakai requireSuperAdmin() karena SSE adalah long-lived connection
// yang tidak selalu membawa header middleware x-is-super-admin dengan benar.

async function verifySuperAdminCookie(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() { /* read-only */ }
        }
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false

    // Cek via app_metadata (diisi Edge Function inject-custom-claims)
    const appMeta = user.app_metadata ?? {}
    if (appMeta['app_role'] === 'super_admin') return true

    // Fallback: cek via JWT payload langsung
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      try {
        const parts   = session.access_token.split('.')
        if (parts.length === 3) {
          const pad     = parts[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(Buffer.from(pad, 'base64').toString('utf-8'))
          if (payload['app_role'] === 'super_admin') return true
          // Cek custom claims dari inject-custom-claims edge function
          if (payload['is_super_admin'] === true)   return true
        }
      } catch { /* abaikan */ }
    }

    return false
  } catch {
    return false
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const isValid = await verifySuperAdminCookie()
  if (!isValid) {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak' },
      { status: 403 }
    )
  }

  const encoder     = new TextEncoder()
  let lastCheckedAt = new Date().toISOString()
  let pollCount     = 0

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: MetricSSEEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      async function poll() {
        try {
          if (req.signal.aborted) {
            controller.close()
            return
          }

          pollCount++

          if (pollCount % HEARTBEAT_EVERY === 0) {
            send({ type: 'heartbeat' })
          }

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
