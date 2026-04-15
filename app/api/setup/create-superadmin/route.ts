import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

function initAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    initAdmin()
    const db = getFirestore()
    const auth = getAuth()

    const settingsDoc = await db.collection('platform_config').doc('settings').get()
    if (settingsDoc.exists && settingsDoc.data()?.is_setup_complete === true) {
      return NextResponse.json({ message: 'Setup sudah selesai. Akses ditolak.' }, { status: 403 })
    }

    const { nama, email, password, setupKey } = await request.json()

    if (!nama || !email || !password || !setupKey) {
      return NextResponse.json({ message: 'Semua field wajib diisi.' }, { status: 400 })
    }

    if (setupKey !== process.env.SETUP_KEY) {
      return NextResponse.json({ message: 'Setup key tidak valid.' }, { status: 401 })
    }

    if (password.length < 8) {
      return NextResponse.json({ message: 'Password minimal 8 karakter.' }, { status: 400 })
    }

    const user = await auth.createUser({
      email,
      password,
      displayName: nama,
      emailVerified: true,
    })

    await auth.setCustomUserClaims(user.uid, {
      role: 'SUPERADMIN',
      tenant_id: null,
    })

    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      nama,
      email,
      role: 'SUPERADMIN',
      tenant_id: null,
      created_at: FieldValue.serverTimestamp(),
    })

    await db.collection('platform_config').doc('settings').set(
      { is_setup_complete: true, setup_completed_at: FieldValue.serverTimestamp() },
      { merge: true }
    )

    return NextResponse.json({ success: true, message: 'Akun SuperAdmin berhasil dibuat.' })

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ message: 'Email sudah digunakan. Gunakan email lain.' }, { status: 400 })
    }
    console.error('[setup] Error:', error)
    return NextResponse.json({ message: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
