// lib/firebase.ts
// File ini adalah koneksi utama ke Firebase
// Semua modul lain akan import dari sini
 
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Konfigurasi Firebase — diambil dari environment variable (.env.local)
// TIDAK ada nilai yang hardcode di sini
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
   
  // Inisialisasi Firebase — dicegah duplikasi saat hot-reload Next.js
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
   
  // Export koneksi yang akan dipakai semua modul lain
  export const db = getFirestore(app);   // koneksi ke Firestore (database)
  export const auth = getAuth(app);       // koneksi ke Auth (login)
  export default app;