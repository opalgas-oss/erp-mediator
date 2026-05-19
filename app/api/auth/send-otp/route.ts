// app/api/auth/send-otp/route.ts
// POST — Generate OTP, simpan ke otp_codes, kirim via channel yang dikonfigurasi SA.
// REFACTOR Sesi #052 — BLOK E-04 TODO_ARSITEKTUR_LAYER_v1:
//   - Semua logika dipindahkan ke OTPService.sendOTP()
//   - Route handler hanya: validasi input → gate require_otp → panggil service → return response
//   - Tidak ada lagi query DB langsung atau getCredential di route
//
// PERUBAHAN Sesi #167 — T-039:
//   - Tambah field email (opsional) ke RequestSchema — diisi jika channel = email.
//   - Pass email ke sendOTP() params.
//
// PERUBAHAN S#182 — FIX-2:
//   Hapus mode 'optional' — hanya 'required' dan 'disabled' sesuai desain SA.
//   Dulu: 'optional' → cek user_profiles.use_otp (per-user preference).
//   Sekarang: SA set per-role hanya required/disabled. Per-user control = fitur AdminTenant terpisah.
//   - Hapus import createServerSupabaseClient — tidak lagi dibutuhkan di route ini.
//   - Hapus blok if (otpMode === 'optional') {...} sepenuhnya.

import { NextRequest, NextResponse }    from 'next/server'
import { z }                            from 'zod'
import { verifyJWT }                    from '@/lib/auth-server'
import { sendOTP }                      from '@/lib/services/otp.service'
import { getConfigValues }              from '@/lib/config-registry'
import { parseRequireOtpForRole }       from '@/app/login/login-types'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:       z.string().min(1, 'uid wajib diisi'),
  tenant_id: z.string(),
  role:      z.string().min(1, 'role wajib diisi'),
  nomor_wa:  z.string().min(1, 'nomor_wa wajib diisi'),
  email:     z.string().email().optional().or(z.literal('')),  // opsional — untuk channel email
  nama:      z.string().default(''),
})

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Verifikasi JWT ────────────────────────────────────────────────────────
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // ── Validasi input ────────────────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { uid, tenant_id, role, nomor_wa, email, nama } = parsed.data

    // ── SERVER-SIDE GATE: cek require_otp per role (FIX-2 S#182: hanya required/disabled) ──
    //
    // Gate ini adalah sumber kebenaran server-side — tidak bisa di-bypass oleh client.
    // Membaca require_otp JSON per-role dari config_registry, bukan dari client state.
    // Hanya 2 mode yang valid: 'required' (OTP wajib) dan 'disabled' (OTP tidak pernah dikirim).
    const cfg           = await getConfigValues('security_login')
    const requireOtpRaw = cfg['require_otp'] ?? 'required'
    const otpMode       = parseRequireOtpForRole(requireOtpRaw, role)

    if (otpMode === 'disabled') {
      // SA set role ini 'disabled' → OTP tidak dikirim
      return NextResponse.json({ success: true, otp_skipped: true })
    }

    // otpMode === 'required' → lanjut sendOTP()

    // ── Delegasi ke OTPService ────────────────────────────────────────────────
    const result = await sendOTP({
      uid,
      tenantId: tenant_id,
      role,
      nomorWa:  nomor_wa,
      email:    email || undefined,
      nama:     nama || undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success:                 true,
      otp_expiry_minutes:      result.otp_expiry_minutes,
      otp_max_attempts:        result.otp_max_attempts,
      resend_cooldown_seconds: result.resend_cooldown_seconds,
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    console.error('[send-otp] Error:', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
