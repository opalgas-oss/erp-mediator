import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app'
import { initializeFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// ─── Konfigurasi Service Account ─────────────────────────────────────────────
const serviceAccount = {
  projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// ─── Inisialisasi Firebase Admin — satu kali, dipakai seluruh aplikasi ────────
// getApps() mencegah duplikasi instance saat hot-reload Next.js
export function getAdminApp() {
  if (getApps().length === 0) {
    return initializeApp({ credential: cert(serviceAccount as any) })
  }
  return getApp()
}

// ─── Firestore Admin dengan preferRest ───────────────────────────────────────
// preferRest: true → pakai HTTP/1.1 REST bukan gRPC
// Mengurangi cold start dari 4-5 detik ke 1-2 detik di Vercel serverless
// Solusi resmi dari Firebase/Google engineers untuk serverless environment
let firestoreInstance: ReturnType<typeof initializeFirestore> | null = null

export function getAdminDb() {
  if (firestoreInstance) return firestoreInstance
  const app = getAdminApp()
  firestoreInstance = initializeFirestore(app, { preferRest: true })
  return firestoreInstance
}

// ─── Firebase Auth Admin ──────────────────────────────────────────────────────
export function getAdminAuth() {
  return getAuth(getAdminApp())
}
