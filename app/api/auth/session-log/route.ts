// app/api/auth/session-log/route.ts
// POST — Tulis session log baru saat login berhasil.
// Dipanggil oleh useLoginFlow.ts dari browser — menggantikan direct DB call.
// Dibuat: Sesi #053 — FIX #7 Audit Logic FASE 1
//
// ARSITEKTUR:
//   Browser (useLoginFlow) → POST /api/auth/session-log → SessionService → Repository → DB
//
// UPDATE Sesi #058 LANGKAH 1 — pakai Next.js after():
//   Pattern BARU:
//     1. Generate sessionId di handler (crypto.randomUUID)
//     2. Return session_id ke client SEGERA (response ~50-100 ms)
//     3. INSERT DB jalan di after() — tidak blocking response
//   Dampak: browser tidak perlu tunggu INSERT (~1,4 detik) sebelum lanjut redirect.

import { NextRequest, NextResponse } from 'next/server'
import { after }                     from 'next/server'
import { z }                         from 'zod'
import { verifyJWT }                 from '@/lib/auth-server'
import { writeSessionLog }           from '@/lib/services/session.service'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:        z.string().min(1, 'uid wajib diisi'),
  tenant_id:  z.string().nullable(),
  role:       z.string().min(1, 'role wajib diisi'),
  device:     z.string().min(1, 'device wajib diisi'),
  gps_kota:   z.string().default('Tidak Diketahui'),
  session_id: z.string().optional(),  // OPTIMASI Sesi #076 — dari client jika fire-and-forget
})

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Verifikasi JWT ────────────────────────────────────────────────────────
    const decoded = await verifyJWT()
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
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

    const { uid, tenant_id, role, device, gps_kota, session_id } = parsed.data

    // OPTIMASI Sesi #076: pakai sessionId dari client jika tersedia (fire-and-forget pattern)
    // Jika tidak ada (flow lama yg await), generate UUID baru seperti sebelumnya
    const sessionId = session_id ?? crypto.randomUUID()

    after(async () => {
      try {
        await writeSessionLog({
          uid,
          tenantId: tenant_id,
          role,
          device,
          gpsKota:  gps_kota,
          sessionId,  // pass sessionId yang sama dengan yang di-return ke client
        })
      } catch (err) {
        console.error('[session-log after()] INSERT gagal:', err)
      }
    })

    return NextResponse.json({ success: true, session_id: sessionId })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    console.error('[session-log] Error:', error)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
