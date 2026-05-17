// app/api/auth/check-session/route.ts
// POST — Cek sesi paralel user di tenant yang sama.
//
// FIX Sesi #074 — Berdasarkan research industri (Tokopedia, Shopee, OWASP ASVS v4):
//   Sesi paralel TIDAK diblokir — user diberi informasi + pilihan (bukan error/block).
//   "blocked: true" dihapus — diganti "hasActiveSession: true" + sessionData.
//   Client yang memutuskan apakah tampilkan peringatan atau langsung lanjut.
//
// CATATAN: Route ini masih dipanggil dari runFlowLama() di useLoginFlow.ts
//   (untuk fallback Customer via flow lama). loginUnifiedAction sudah pakai
//   cekSesiParalel() dari login-session-check.ts secara langsung.
//
// REFACTOR Sesi #052 — BLOK E-06: Pakai SessionService.findActiveSessions

import { NextRequest, NextResponse }  from 'next/server'
import { z }                          from 'zod'
import { getConfigValue }             from '@/lib/config-registry'
import { findActiveSessions }         from '@/lib/services/session.service'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:       z.string().min(1, 'uid wajib diisi'),
  tenant_id: z.string().min(1, 'tenant_id wajib diisi'),
  role:      z.string().optional(),
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

    const { uid, tenant_id, role: roleLogin } = parsed.data

    // ── Baca concurrent_rule dari config_registry ─────────────────────────────
    const rule = await getConfigValue('security_login', 'concurrent_rule', 'different_role_only')

    // ── Rule 'none' → izinkan langsung, tidak perlu tampilkan peringatan ──────
    if (rule === 'none') {
      return NextResponse.json({ hasActiveSession: false, blocked: false })
    }

    // ── Query sesi aktif via SessionService ──────────────────────────────────
    const sessions = await findActiveSessions(uid, tenant_id)

    // ── Tidak ada sesi aktif → izinkan ───────────────────────────────────────
    if (sessions.length === 0) {
      return NextResponse.json({ hasActiveSession: false, blocked: false })
    }

    // ── Ada sesi aktif — ambil data sesi pertama sebagai referensi ───────────
    const first = sessions[0]
    const sessionData: SessionData = {
      device:   first.device   ?? '',
      gps_kota: first.gps_kota ?? '',
      login_at: first.login_at ?? null,
      role:     first.role     ?? '',
    }

    // ── Rule 'always' → beri info ke client, bukan blokir ────────────────────
    // blocked: false — client menampilkan UI peringatan tapi tidak memblokir login
    if (rule === 'always') {
      return NextResponse.json({ hasActiveSession: true, blocked: false, sessionData })
    }

    // ── Rule 'different_role_only' → beri info hanya jika role berbeda ────────
    if (rule === 'different_role_only') {
      const roleSesiAktif  = (sessionData.role ?? '').toUpperCase()
      const roleLoginUpper = (roleLogin ?? '').toUpperCase()

      // Role sama → izinkan langsung (no warning needed)
      if (roleLoginUpper && roleSesiAktif === roleLoginUpper) {
        return NextResponse.json({ hasActiveSession: false, blocked: false })
      }

      // Role berbeda → beri info ke client
      return NextResponse.json({ hasActiveSession: true, blocked: false, sessionData })
    }

    // ── Fallback → izinkan ────────────────────────────────────────────────────
    return NextResponse.json({ hasActiveSession: false, blocked: false })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
