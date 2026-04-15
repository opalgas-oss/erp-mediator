import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

export async function GET() {
  try {
    initAdmin()
    const db = getFirestore()
    const doc = await db.collection('platform_config').doc('settings').get()
    const is_setup_complete = doc.exists
      ? (doc.data()?.is_setup_complete ?? false)
      : false
    return NextResponse.json({ is_setup_complete })
  } catch {
    return NextResponse.json({ is_setup_complete: false })
  }
}
