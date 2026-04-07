import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// ============================================================
// INISIALISASI FIREBASE ADMIN — Hanya berjalan di server
// Firebase Admin berbeda dari Firebase biasa di lib/firebase.ts
// Firebase biasa = untuk browser, Firebase Admin = untuk server
// ============================================================
function initAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

// ============================================================
// POST /api/auth/set-custom-claims
// Menerima: uid, role, tenant_id
// Melakukan: set custom claims ke token JWT user
// Keamanan: hanya bisa dipanggil dari server — bukan dari browser langsung
// ============================================================
export async function POST(request: NextRequest) {
  try {
    initAdmin();

    const body = await request.json();
    const { uid, role, tenant_id } = body;

    // Validasi input — pastikan semua field ada
    if (!uid || !role || !tenant_id) {
      return NextResponse.json(
        { error: 'uid, role, dan tenant_id wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi role — hanya role yang diizinkan
    const roleYangDiizinkan = ['CUSTOMER', 'VENDOR', 'SUPER_ADMIN', 'DISPATCHER', 'FINANCE', 'SUPPORT'];
    if (!roleYangDiizinkan.includes(role)) {
      return NextResponse.json(
        { error: 'Role tidak valid' },
        { status: 400 }
      );
    }

    // Set custom claims ke token JWT user di Firebase
    // Ini yang membuat middleware bisa baca role dari token
    await getAuth().setCustomUserClaims(uid, {
      role: role,
      tenant_id: tenant_id,
      is_platform_owner: false,
    });

    // Catat audit log ke Firestore
    const db = getFirestore();
    await db.collection(`tenants/${tenant_id}/audit_logs`).add({
      action: 'SET_CUSTOM_CLAIMS',
      actor: uid,
      role: role,
      tenant_id: tenant_id,
      timestamp: new Date(),
    });

    return NextResponse.json(
      { success: true, message: 'Custom claims berhasil ditetapkan' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error set-custom-claims:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}