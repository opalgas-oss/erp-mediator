// app/api/auth/lock-account/route.ts
// POST — Catat login gagal dan kunci akun jika sudah mencapai batas maksimal.
// Dipanggil oleh login/page.tsx setiap kali Supabase Auth mengembalikan error kredensial.
//
// REFACTOR Sesi #052 — BLOK E-02 TODO_ARSITEKTUR_LAYER_v1:
//   - Import dari Service layer (bukan lib/ langsung)
//   - User lookup via UserRepository (bukan query langsung)
//   - sendLockNotificationWA dari AccountLockService (sudah cek config notify)
//   - getCredential dari CredentialService (untuk filter nomor_wa Fonnte)

import { NextRequest, NextResponse } from 'next/server'
import { z }                         from 'zod'
import {
  incrementLockCount,
  sendLockNotificationWA,
} from '@/lib/services/account-lock.service'
import { getCredential } from '@/lib/services/credential.service'
import { findByEmail as findUserByEmail, findSuperAdminEmail } from '@/lib/repositories/user.repository'
import { getPlatformTimezone } from '@/lib/config-registry'
import { ROLES }              from '@/lib/constants'

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  email:     z.string().email('Format email tidak valid'),
  tenant_id: z.string().nullable().optional(),
})

// ─── Helper: Format Date ke string waktu lokal platform ──────────────────────

async function formatWaktuLokal(isoString: string): Promise<string> {
  const timezone = await getPlatformTimezone()
  return new Date(isoString)
    .toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
    })
    .replace(':', '.') + ' WIB'
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

    // ── Lookup user via UserRepository (3 tahap) ─────────────────────────────
    const user = await findUserByEmail(email)

    let uid      = user?.uid ?? crypto.randomUUID()
    let nama     = user?.nama ?? email
    let nomor_wa = user?.nomor_wa ?? ''

    // Filter nomor_wa: kalau SuperAdmin, nomor_wa mungkin array — filter Fonnte device
    if (user?.source === 'users' && nomor_wa) {
      try {
        const fonnteDevice = await getCredential('fonnte', 'device_number') || ''
        // nomor_wa dari users bisa TEXT[] — cek apakah perlu filter
        if (fonnteDevice && nomor_wa === fonnteDevice) {
          nomor_wa = ''
        }
      } catch { /* abaikan — pakai nomor_wa apa adanya */ }
    }

    if (!user) {
      console.warn('[lock-account] user tidak ditemukan untuk email:', email, '— pakai generated UUID')
    }

    // ── Tambah counter gagal via AccountLockService ──────────────────────────
    const result = await incrementLockCount({
      uid, email, nama, nomor_wa, tenantId: tenant_id,
    })

    // ── Akun BARU SAJA dikunci — kirim notifikasi WA via Service ─────────────
    if (result.locked && result.lock_until) {
      if (nomor_wa) {
        const superadminEmail = await findSuperAdminEmail() ?? ''
        // Service sudah cek notify_superadmin_on_lock dari config
        await sendLockNotificationWA({
          nomor_wa,
          nama,
          lock_until:         new Date(result.lock_until),
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
