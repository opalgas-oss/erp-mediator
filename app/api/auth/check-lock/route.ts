// app/api/auth/check-lock/route.ts
// POST — Cek apakah akun sedang dikunci karena terlalu banyak percobaan login gagal.
// Dipanggil oleh login/page.tsx SEBELUM memanggil Supabase Auth,
// sehingga user tidak perlu menunggu Auth untuk tahu akunnya terkunci.
//
// MIGRASI Sesi #037: Firebase Admin + Firestore → Supabase PostgreSQL (tabel account_locks)
//
// PERUBAHAN Sesi #042:
//   - Ganti hardcode 'Asia/Jakarta' → getPlatformTimezone() dari config_registry
//     Arsitektur timezone 3-level: platform default → tenant override → user preference
//
// PERUBAHAN Sesi #045 — Fix Performa:
//   - Tambah field had_attempts di semua response path
//   - had_attempts: true  → ada percobaan gagal di DB, unlock-account perlu dipanggil
//   - had_attempts: false → tidak ada record atau count = 0, unlock-account bisa di-skip
//   - Tujuan: guard clause di login/page.tsx agar unlock-account hanya dipanggil bila perlu
//     Hemat ~1.13s di setiap login normal (tidak ada percobaan gagal sebelumnya)

import { NextRequest, NextResponse }  from 'next/server'
import { z }                          from 'zod'
import { getAccountLock }             from '@/lib/account-lock'
import { getPlatformTimezone }        from '@/lib/config-registry'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  email: z.string().email('Format email tidak valid'),
})

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Validasi input dengan Zod ─────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { email } = parsed.data

    // ── Cek tabel account_locks di Supabase PostgreSQL ────────────────────────
    const lockDoc = await getAccountLock(email)

    // Tidak ada record → akun belum pernah gagal login, tidak perlu unlock
    if (!lockDoc) {
      return NextResponse.json({ locked: false, had_attempts: false })
    }

    // ── Evaluasi apakah kunci masih aktif ─────────────────────────────────────
    const sekarang   = Date.now()
    const lockUntil  = lockDoc.lock_until ? new Date(lockDoc.lock_until).getTime() : null
    const masihKunci = lockDoc.status === 'locked' && lockUntil !== null && lockUntil > sekarang

    // Akun tidak terkunci — cek apakah masih ada sisa counter percobaan gagal
    // had_attempts: true → login/page.tsx wajib panggil unlock-account untuk reset count
    // had_attempts: false → counter sudah 0, unlock-account tidak perlu dipanggil
    if (!masihKunci) {
      return NextResponse.json({ locked: false, had_attempts: (lockDoc.count ?? 0) > 0 })
    }

    // ── Format lock_until ke waktu lokal platform — timezone dari config_registry
    const timezone      = await getPlatformTimezone()
    const lockUntilDate = new Date(lockUntil)
    const lockUntilWIB  = lockUntilDate
      .toLocaleTimeString('id-ID', {
        hour:     '2-digit',
        minute:   '2-digit',
        timeZone: timezone,
        hour12:   false,
      })
      .replace(':', '.') + ' WIB'

    // Akun terkunci — had_attempts selalu true (ada record dengan count >= max)
    return NextResponse.json({ locked: true, lock_until_wib: lockUntilWIB, had_attempts: true })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
