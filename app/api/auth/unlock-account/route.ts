// app/api/auth/unlock-account/route.ts
// POST — Buka kunci akun yang terkunci karena terlalu banyak percobaan login gagal.
//
// Dua skenario:
//   method "auto"   → dipanggil server setelah login berhasil, reset counter
//   method "manual" → dipanggil SuperAdmin dari dashboard (Sprint 2), butuh otorisasi JWT
//
// PERUBAHAN dari versi Firebase:
//   - Hapus Firebase Admin initAdmin() dan getAuth()
//   - Verifikasi JWT manual → Supabase auth.getUser() via createServerClient
//
// PERUBAHAN Sesi #041:
//   - tenant_id: boleh null — SUPERADMIN tidak punya tenant_id

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { createServerClient }        from '@supabase/ssr'
import { cookies }                   from 'next/headers'
import { unlockAccount }             from '@/lib/account-lock'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  uid:             z.string().min(1, 'uid wajib diisi'),
  tenant_id:       z.string().nullable().optional(),
  email:           z.string().email().optional(),   // opsional — untuk fallback unlock SUPERADMIN by email
  method:          z.enum(['auto', 'manual'] as const, {
    message: 'method harus "auto" atau "manual"',
  }),
  unlocked_by_uid: z.string().optional(),
})

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

    const { uid, method, unlocked_by_uid } = parsed.data
    const tenant_id = parsed.data.tenant_id ?? null
    const email     = parsed.data.email     ?? undefined

    // ── Custom validation: method "manual" wajib sertakan unlocked_by_uid ─────
    if (method === 'manual' && !unlocked_by_uid) {
      return NextResponse.json(
        { error: 'unlocked_by_uid wajib ada untuk method manual' },
        { status: 400 }
      )
    }

    // ── Otorisasi — hanya untuk method "manual" ───────────────────────────────
    if (method === 'manual') {
      const cookieStore = await cookies()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll() { /* Route handler — diabaikan */ }
          }
        }
      )

      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Hanya SUPERADMIN yang boleh unlock manual
      const role = user.app_metadata?.['app_role']
      if (role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // ── Buka kunci akun ───────────────────────────────────────────────────────
    await unlockAccount(uid, tenant_id, method, unlocked_by_uid, email)

    return NextResponse.json({ success: true, method })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
