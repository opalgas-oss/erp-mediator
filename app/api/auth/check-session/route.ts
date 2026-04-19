// app/api/auth/check-session/route.ts
// POST — Cek apakah user sudah punya sesi aktif di tenant ini
// Dipakai sebelum login selesai untuk menegakkan aturan sesi paralel
//
// PERUBAHAN dari versi Firebase:
//   - Hapus Firebase Admin initAdmin() dan getFirestore()
//   - Query Firestore session_logs → query tabel session_logs PostgreSQL
//   - getEffectivePolicy tetap dipakai — tidak berubah

import { NextRequest, NextResponse }  from 'next/server'
import { z }                          from 'zod'
import { getConfigValue }             from '@/lib/config-registry'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:       z.string().min(1, 'uid wajib diisi'),
  tenant_id: z.string().min(1, 'tenant_id wajib diisi'),
})

// ─── Tipe Data Sesi ───────────────────────────────────────────────────────────

interface SessionData {
  device:   string
  gps_kota: string
  login_at: string | null
  role:     string
}

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Validasi input ────────────────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { uid, tenant_id } = parsed.data

    // ── Baca concurrent_rule dari Modul Konfigurasi (config_registry) ────────
    // Nilai ini bisa diubah SuperAdmin dari Dashboard Modul Konfigurasi
    const rule = await getConfigValue('security_login', 'concurrent_rule', 'different_role_only')

    // ── Rule 'none' → izinkan langsung tanpa cek sesi ────────────────────────
    if (rule === 'none') {
      return NextResponse.json({ hasActiveSession: false, blocked: false })
    }

    // ── Query tabel session_logs — cari sesi aktif untuk uid ini ─────────────
    const { createServerSupabaseClient } = await import('@/lib/supabase-server')
    const db = createServerSupabaseClient()

    const { data: sessions, error } = await db
      .from('session_logs')
      .select('device, gps_kota, login_at, role')
      .eq('uid', uid)
      .eq('tenant_id', tenant_id)
      .is('logout_at', null)
      .limit(10)

    if (error) throw error

    // ── Tidak ada sesi aktif → izinkan login ─────────────────────────────────
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ hasActiveSession: false, blocked: false })
    }

    // ── Ada sesi aktif — ambil data sesi pertama sebagai referensi ───────────
    const first = sessions[0]
    const sessionData: SessionData = {
      device:   typeof first.device   === 'string' ? first.device   : '',
      gps_kota: typeof first.gps_kota === 'string' ? first.gps_kota : '',
      login_at: first.login_at ?? null,
      role:     typeof first.role     === 'string' ? first.role     : '',
    }

    // ── Rule 'always' → blokir jika ada sesi aktif apapun ────────────────────
    if (rule === 'always') {
      return NextResponse.json({ hasActiveSession: true, blocked: true, sessionData })
    }

    // ── Rule 'different_role_only' → blokir karena satu uid = satu role ──────
    if (rule === 'different_role_only') {
      return NextResponse.json({ hasActiveSession: true, blocked: true, sessionData })
    }

    // ── Fallback → izinkan ────────────────────────────────────────────────────
    return NextResponse.json({ hasActiveSession: true, blocked: false, sessionData })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}