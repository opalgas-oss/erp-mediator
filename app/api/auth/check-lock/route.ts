// app/api/auth/check-lock/route.ts
// POST — Cek apakah akun sedang dikunci karena terlalu banyak percobaan login gagal.
// Dipanggil oleh login/page.tsx SEBELUM memanggil Firebase Auth,
// sehingga user tidak perlu menunggu Firebase untuk tahu akunnya terkunci.

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import { getAccountLock }            from '@/lib/account-lock'

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

    // ── Cek dokumen account_lock di Firestore ─────────────────────────────────
    const lockDoc = await getAccountLock(email)

    // Tidak ada dokumen → akun belum pernah dikunci
    if (!lockDoc) {
      return NextResponse.json({ locked: false })
    }

    // ── Evaluasi apakah kunci masih aktif ─────────────────────────────────────
    const sekarang  = Date.now()
    const lockUntil = lockDoc.lock_until ? new Date(lockDoc.lock_until).getTime() : null
    const masihKunci = lockDoc.status === 'locked' && lockUntil !== null && lockUntil > sekarang

    if (!masihKunci) {
      // Kunci sudah kadaluarsa atau status bukan "locked"
      return NextResponse.json({ locked: false })
    }

    // ── Format lock_until ke waktu WIB ───────────────────────────────────────
    // Format: "HH.mm WIB" — contoh: "09.30 WIB"
    const lockUntilDate = new Date(lockUntil)
    const lockUntilWIB  = lockUntilDate
      .toLocaleTimeString('id-ID', {
        hour:     '2-digit',
        minute:   '2-digit',
        timeZone: 'Asia/Jakarta',
        hour12:   false,
      })
      .replace(':', '.') + ' WIB'

    return NextResponse.json({ locked: true, lock_until_wib: lockUntilWIB })

  } catch (error: unknown) {
    // Tidak ekspos stack trace — hanya pesan singkat
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
