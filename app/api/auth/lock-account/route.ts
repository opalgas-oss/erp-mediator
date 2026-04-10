// app/api/auth/lock-account/route.ts
// POST — Catat login gagal dan kunci akun jika sudah mencapai batas maksimal.
// Dipanggil oleh login/page.tsx setiap kali Firebase Auth mengembalikan error kredensial.

import { NextRequest, NextResponse }          from 'next/server'
import { z }                                  from 'zod'
import { initializeApp, getApps, cert }       from 'firebase-admin/app'
import { getFirestore }                       from 'firebase-admin/firestore'
import { incrementLockCount, sendLockNotificationWA } from '@/lib/account-lock'

// ─── Inisialisasi Firebase Admin ─────────────────────────────────────────────
// Hanya inisialisasi sekali — getApps() mencegah duplikasi instance

function initAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

// ─── Skema Validasi Input ─────────────────────────────────────────────────────

const RequestSchema = z.object({
  email:     z.string().email('Format email tidak valid'),
  tenant_id: z.string().min(1, 'tenant_id wajib diisi'),
})

// ─── Helper: Format Date ke string waktu WIB ──────────────────────────────────
// Contoh output: "09.30 WIB"

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

// ─── Helper: Cari email SuperAdmin dari Firestore ─────────────────────────────
// Path: /tenants/{tenant_id}/users/ WHERE role == "SUPERADMIN" LIMIT 1
// Kalau tidak ada → pakai email fallback

async function cariEmailSuperAdmin(tenantId: string): Promise<string> {
  const FALLBACK_EMAIL = 'admin@erp-mediator.com'
  try {
    const db       = getFirestore()
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('users')
      .where('role', '==', 'SUPERADMIN')
      .limit(1)
      .get()

    if (snapshot.empty) return FALLBACK_EMAIL

    const data = snapshot.docs[0].data()
    return typeof data.email === 'string' && data.email ? data.email : FALLBACK_EMAIL
  } catch {
    // Kalau query gagal, jangan crash endpoint — pakai fallback
    return FALLBACK_EMAIL
  }
}

// ─── Handler POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    initAdmin()

    // ── Validasi input dengan Zod ─────────────────────────────────────────────
    const body   = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      )
    }

    const { email, tenant_id } = parsed.data

    // ── Cari data user dari Firestore berdasarkan email ───────────────────────
    const db       = getFirestore()
    const snapshot = await db
      .collection('tenants')
      .doc(tenant_id)
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
    }

    const userDoc  = snapshot.docs[0]
    const userData = userDoc.data()
    const uid      = userDoc.id
    const nama     = (userData.nama as string) || (userData.name as string) || email
    const nomor_wa = (userData.nomor_wa as string) || (userData.phone as string) || ''

    // ── Tambah counter gagal dan evaluasi apakah akun perlu dikunci ───────────
    const result = await incrementLockCount({
      uid,
      email,
      nama,
      nomor_wa,
      tenantId: tenant_id,
    })

    // ── Akun BARU SAJA dikunci — kirim notifikasi WA dan return info kunci ────
    if (result.locked && result.lock_until) {
      // Cari email SuperAdmin untuk dicantumkan di pesan WA
      const superadminEmail = await cariEmailSuperAdmin(tenant_id)

      // Kirim notifikasi WA — gagal kirim tidak boleh crash endpoint
      await sendLockNotificationWA({
        nomor_wa:           nomor_wa,
        nama:               nama,
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

    // ── Belum terkunci — kembalikan count saja ────────────────────────────────
    return NextResponse.json({
      locked: false,
      count:  result.count,
    })

  } catch (error: unknown) {
    // Tidak ekspos stack trace ke client — hanya pesan singkat
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
