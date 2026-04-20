// app/api/auth/lock-account/route.ts
// POST — Catat login gagal dan kunci akun jika sudah mencapai batas maksimal.
// Dipanggil oleh login/page.tsx setiap kali Supabase Auth mengembalikan error kredensial.
//
// PERUBAHAN dari versi Firebase:
//   - Hapus Firebase Admin initAdmin() dan getFirestore()
//   - Query user → tabel users (SuperAdmin) + user_profiles (role lain)
//   - cariEmailSuperAdmin → query tabel users di PostgreSQL
//
// PERUBAHAN Sesi #041:
//   - tenant_id: boleh null — SUPERADMIN tidak punya tenant_id
//   - Fallback user lookup: auth.admin.listUsers() → tetap buat lock record
//   - Tidak return early jika user tidak ada di DB
//
// PERUBAHAN Sesi #042:
//   - Ganti process.env.FONNTE_DEVICE_NUMBER → getCredential('fonnte', 'device_number')
//     Nilai device_number sekarang dibaca dari instance_credentials di DB
//   - Ganti hardcode 'Asia/Jakarta' → getPlatformTimezone() dari config_registry
//
// PERUBAHAN Sesi #043 — Audit Hardcode TC-C01/C02/C03:
//   - Tambah cek notify_superadmin_on_lock dari config_registry sebelum kirim WA
//     Sebelumnya: notifikasi WA selalu dikirim tanpa cek config (toggle Dashboard tidak berpengaruh)
//     Sekarang: WA hanya dikirim jika notify_superadmin_on_lock = true (default: true)

import { NextRequest, NextResponse }                  from 'next/server'
import { z }                                          from 'zod'
import { createServerSupabaseClient }                 from '@/lib/supabase-server'
import { incrementLockCount, sendLockNotificationWA } from '@/lib/account-lock'
import { getCredential }                              from '@/lib/credential-reader'
import { getPlatformTimezone, getConfigValues, parseConfigBoolean } from '@/lib/config-registry'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  email:     z.string().email('Format email tidak valid'),
  tenant_id: z.string().nullable().optional(),
})

// ─── Helper: Format Date ke string waktu lokal platform ──────────────────────

async function formatWaktuLokal(date: Date): Promise<string> {
  const timezone = await getPlatformTimezone()
  return date
    .toLocaleTimeString('id-ID', {
      hour:     '2-digit',
      minute:   '2-digit',
      timeZone: timezone,
      hour12:   false,
    })
    .replace(':', '.') + ' WIB'
}

// ─── Helper: Cari email SuperAdmin dari tabel users ──────────────────────────

async function cariEmailSuperAdmin(): Promise<string> {
  try {
    const db = createServerSupabaseClient()
    const { data } = await db
      .from('users')
      .select('email')
      .eq('role', 'SUPERADMIN')
      .limit(1)
      .single()
    return data?.email ?? ''
  } catch {
    return ''
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

    const { email } = parsed.data
    const tenant_id = parsed.data.tenant_id ?? null
    const db = createServerSupabaseClient()

    // ── Ambil nomor device Fonnte dari instance_credentials (bukan env) ───────
    const fonnteDevice = await getCredential('fonnte', 'device_number') || ''

    // ── Cari user berdasarkan email (3 tahap) ─────────────────────────────────
    let uid      = ''
    let nama     = email
    let nomor_wa = ''

    // Tahap 1: cek tabel users (SuperAdmin di DB)
    const { data: userRow } = await db
      .from('users')
      .select('id, nama, email, nomor_wa')
      .eq('email', email)
      .maybeSingle()

    if (userRow) {
      uid  = userRow.id
      nama = userRow.nama
      // nomor_wa di tabel users adalah TEXT[] — ambil elemen pertama yang bukan nomor device Fonnte
      const nomorWaArray = (userRow.nomor_wa as string[] | null) || []
      nomor_wa = nomorWaArray.find(n => n !== fonnteDevice) || nomorWaArray[0] || ''
    }

    // Tahap 2: cek tabel user_profiles (non-SUPERADMIN)
    if (!uid) {
      let profileQuery = db
        .from('user_profiles')
        .select('id, nama, nomor_wa')
        .eq('email', email)

      if (tenant_id) {
        profileQuery = profileQuery.eq('tenant_id', tenant_id) as typeof profileQuery
      }

      const { data: profile } = await profileQuery.maybeSingle()

      if (profile) {
        uid      = profile.id
        nama     = profile.nama
        nomor_wa = profile.nomor_wa ?? ''
      }
    }

    // Tahap 3: fallback ke Supabase Auth
    if (!uid) {
      try {
        const { data: { users: authUsers } } = await db.auth.admin.listUsers()
        const authUser = authUsers.find(u => u.email === email)
        if (authUser) {
          uid  = authUser.id
          nama = (authUser.user_metadata?.nama as string) || email
        }
      } catch (errAuth) {
        console.error('[lock-account] fallback auth lookup gagal:', errAuth)
      }
    }

    // ── Fallback final: generate UUID jika uid masih kosong ─────────────────
    if (!uid) {
      uid = crypto.randomUUID()
      console.warn('[lock-account] uid tidak ditemukan untuk email:', email, '— pakai generated UUID')
    }

    console.log('[lock-account] akan catat lock:', { email, uid: uid.slice(0, 8) + '...', tenant_id })

    // ── Tambah counter gagal dan evaluasi apakah akun perlu dikunci ───────────
    const result = await incrementLockCount({ uid, email, nama, nomor_wa, tenantId: tenant_id })

    // ── Akun BARU SAJA dikunci — kirim notifikasi WA ──────────────────────────
    if (result.locked && result.lock_until) {
      // Cek notify_superadmin_on_lock dari config_registry — default true jika key tidak ada
      const cfg        = await getConfigValues('security_login')
      const notifAktif = parseConfigBoolean(cfg['notify_superadmin_on_lock'], true)

      if (nomor_wa && notifAktif) {
        const superadminEmail = await cariEmailSuperAdmin()
        await sendLockNotificationWA({
          nomor_wa,
          nama,
          lock_until:         result.lock_until,
          max_login_attempts: result.count,
          superadmin_email:   superadminEmail,
          tenantId:           tenant_id,
        })
      }

      return NextResponse.json({
        locked:         true,
        count:          result.count,
        lock_until_wib: await formatWaktuLokal(result.lock_until),
      })
    }

    return NextResponse.json({ locked: false, count: result.count })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
