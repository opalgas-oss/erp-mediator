// app/api/auth/end-session/route.ts
// POST — Tandai sesi user sebagai logout saat end-session
// REFACTOR Sesi #052 — BLOK E-07: Pakai SessionService + constants

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { markLogout }                from '@/lib/services/session.service'
import { setUserOffline }            from '@/lib/services/activity.service'

const RequestSchema = z.object({
  uid:        z.string().min(1, 'uid wajib diisi'),
  tenant_id:  z.string().min(1, 'tenant_id wajib diisi'),
  session_id: z.string().min(1, 'session_id wajib diisi'),
})

export async function POST(request: NextRequest) {
  try {
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { uid, tenant_id } = parsed.data

    // Tandai semua sesi aktif user ini sebagai logout via SessionService
    await markLogout(uid)

    // Set user offline via ActivityService
    await setUserOffline(uid, tenant_id)

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
