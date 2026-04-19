// app/api/auth/end-session/route.ts
// POST — Tandai sesi user sebagai offline saat logout
// Update tabel session_logs di Supabase PostgreSQL
//
// MIGRASI Sesi #037: Firebase Admin + Firestore → Supabase PostgreSQL

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    const { session_id } = parsed.data
    const db = createServerSupabaseClient()

    await db
      .from('session_logs')
      .update({ status: 'offline', logout_at: new Date().toISOString() })
      .eq('id', session_id)

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
