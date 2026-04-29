// ARSIP sesi-076-selesai-login-nonblocking — session-log/route.ts sebelum modifikasi
// Perubahan: tambah terima session_id opsional dari body

import { NextRequest, NextResponse } from 'next/server'
import { after }                     from 'next/server'
import { z }                         from 'zod'
import { verifyJWT }                 from '@/lib/auth-server'
import { writeSessionLog }           from '@/lib/services/session.service'

const RequestSchema = z.object({
  uid:       z.string().min(1, 'uid wajib diisi'),
  tenant_id: z.string().nullable(),
  role:      z.string().min(1, 'role wajib diisi'),
  device:    z.string().min(1, 'device wajib diisi'),
  gps_kota:  z.string().default('Tidak Diketahui'),
})

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyJWT()
    if (!decoded) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    const { uid, tenant_id, role, device, gps_kota } = parsed.data
    const sessionId = crypto.randomUUID()
    after(async () => {
      try {
        await writeSessionLog({ uid, tenantId: tenant_id, role, device, gpsKota: gps_kota, sessionId })
      } catch (err) { console.error('[session-log after()] INSERT gagal:', err) }
    })
    return NextResponse.json({ success: true, session_id: sessionId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
