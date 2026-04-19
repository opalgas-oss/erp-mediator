// app/api/auth/lock-account/route.ts
// POST — Catat login gagal dan kunci akun jika sudah mencapai batas maksimal.
// Dipanggil oleh login/page.tsx setiap kali Supabase Auth mengembalikan error kredensial.
//
// PERUBAHAN dari versi Firebase:
//   - Hapus Firebase Admin initAdmin() dan getFirestore()
//   - Query user → tabel users (SuperAdmin) + user_profiles (role lain)
//   - cariEmailSuperAdmin → query tabel users di PostgreSQL

import { NextRequest, NextResponse }                  from 'next/server'
import { z }                                          from 'zod'
import { createServerSupabaseClient }                 from '@/lib/supabase-server'
import { incrementLockCount, sendLockNotificationWA } from '@/lib/account-lock'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  email:     z.string().email('Format email tidak valid'),
  tenant_id: z.string().min(1, 'tenant_id wajib diisi'),
})

// ─── Helper: Format Date ke string waktu WIB ─────────────────────────────────

function formatWIB(date: Date): string {
  return date
    .toLocaleTimeString('id-ID', {
      hour:     '2-digit',
      minute:   '2-digit',
      timeZone: 'Asia/Jakarta',
      hour12:   false,
    })
    .replace(':', '.') + ' WIB'
}

// ─── Helper: Cari email SuperAdmin dari tabel users ──────────────────────────

async function cariEmailSuperAdmin(): Promise<string> {
  const FALLBACK_EMAIL = 'admin@erp-mediator.com'
  try {
    const db = createServerSupabaseClient()
    const { data } = await db
      .from('users')
      .select('email')
      .eq('role', 'SUPERADMIN')
      .limit(1)
      .single()
    return data?.email ?? FALLBACK_EMAIL
  } catch {
    return FALLBACK_EMAIL
  }
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

    const { email, tenant_id } = parsed.data
    const db = createServerSupabaseClient()

    // ── Cari user berdasarkan email ───────────────────────────────────────────
    // Cek tabel users (SuperAdmin) dulu, lalu user_profiles (role lain)
    let uid      = ''
    let nama     = email
    let nomor_wa = ''

    const { data: superAdmin } = await db
      .from('users')
      .select('id, nama, email')
      .eq('email', email)
      .single()

    if (superAdmin) {
      uid      = superAdmin.id
      nama     = superAdmin.nama
      nomor_wa = ''
    } else {
      const { data: profile } = await db
        .from('user_profiles')
        .select('id, nama, nomor_wa')
        .eq('email', email)
        .eq('tenant_id', tenant_id)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
      }

      uid      = profile.id
      nama     = profile.nama
      nomor_wa = profile.nomor_wa ?? ''
    }

    // ── Tambah counter gagal dan evaluasi apakah akun perlu dikunci ───────────
    const result = await incrementLockCount({ uid, email, nama, nomor_wa, tenantId: tenant_id })

    // ── Akun BARU SAJA dikunci — kirim notifikasi WA ──────────────────────────
    if (result.locked && result.lock_until) {
      const superadminEmail = await cariEmailSuperAdmin()

      await sendLockNotificationWA({
        nomor_wa,
        nama,
        lock_until:         result.lock_until,
        max_login_attempts: result.count,
        superadmin_email:   superadminEmail,
      })

      return NextResponse.json({
        locked:         true,
        count:          result.count,
        lock_until_wib: formatWIB(result.lock_until),
      })
    }

    return NextResponse.json({ locked: false, count: result.count })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}