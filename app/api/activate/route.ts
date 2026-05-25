// app/api/activate/route.ts
// Endpoint aktivasi akun: GET /api/activate?token=<plain_token>
// Dibuat: Sesi #215 — Fitur Kirim Ulang Email Aktivasi
//
// Flow:
//   1. Ambil token dari query param
//   2. Hash token SHA-256 → cari di activation_email_logs
//   3. Validasi: status=pending, token_expires_at > now()
//   4. UPDATE user_profiles SET lifecycle_status='active'
//   5. UPDATE activation_email_logs SET status='clicked', clicked_at=now()
//   6. Redirect ke /login?activated=1

import { NextRequest, NextResponse } from 'next/server'
import { createHash }                from 'crypto'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token || token.length < 10) {
    return NextResponse.redirect(new URL('/login?activated=error', req.url))
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const adminDb   = createServerSupabaseClient()

  // Cari token di DB + validasi status=pending
  const { data: logRow, error: logError } = await adminDb
    .from('activation_email_logs')
    .select('id, entity_id, token_expires_at, status')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .maybeSingle()

  if (logError || !logRow) {
    return NextResponse.redirect(new URL('/login?activated=invalid', req.url))
  }

  // Cek expiry
  if (new Date(logRow.token_expires_at) < new Date()) {
    return NextResponse.redirect(new URL('/login?activated=expired', req.url))
  }

  // Update lifecycle_status = 'active'
  const { error: updateError } = await adminDb
    .from('user_profiles')
    .update({ lifecycle_status: 'active' })
    .eq('id', logRow.entity_id)
    .eq('lifecycle_status', 'pending')

  if (updateError) {
    console.error('[activate] UPDATE user_profiles gagal:', updateError.message)
    return NextResponse.redirect(new URL('/login?activated=error', req.url))
  }

  // Update log status = 'clicked'
  await adminDb
    .from('activation_email_logs')
    .update({ status: 'clicked', clicked_at: new Date().toISOString() })
    .eq('id', logRow.id)

  return NextResponse.redirect(new URL('/login?activated=1', req.url))
}
