// scripts/seed-tenant.mjs
// Script untuk membuat struktur Firestore dan mengisi data tenant pertama
// Jalankan sekali: node scripts/seed-tenant.mjs
 
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
 
// Baca konfigurasi dari .env.local
const envFile = readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('='))
);
 
const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};
 
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
 
// ============================================================
// DATA TENANT PERTAMA — Bisnis Anda Sendiri
// ============================================================
const TENANT_ID = 'tenant_erpmediator'; // ID unik tenant Anda
 
async function seedTenant() {
  console.log('Mulai setup database...');
 
  // 1. Dokumen konfigurasi utama tenant
  await setDoc(doc(db, 'tenants', TENANT_ID, 'config', 'main'), {
    tenant_id: TENANT_ID,
    brand: {
      name: 'ERP Mediator',
      tagline: 'Platform Jasa Terpercaya',
      primary_color: '#2E6DA4',
      logo_url: '',
    },
    commission: {
      percentage: 10,
      minimum_amount: 50000,
      charged_to: 'vendor', // 'vendor' atau 'customer'
    },
    timers: {
      t1_minutes: 15,  // Durasi auction vendor
      t2_minutes: 60,  // Batas waktu bayar customer
      t3_minutes: 120, // Batas waktu konfirmasi customer
    },
    wa_templates: {
      new_order_blast: 'Halo {vendor_name}! Ada order baru kategori {category}. Klik link untuk bid: {link}',
      order_confirmed: 'Selamat {vendor_name}! Anda terpilih untuk order #{order_id}.',
      payment_received: 'Dana sudah masuk escrow. Silakan mulai bekerja!',
    },
    operational_hours: {
      is_24_hours: false,
      open: '08:00',
      close: '21:00',
    },
    is_active: true,
    created_at: new Date().toISOString(),
  });
  console.log('✅ Config tenant berhasil dibuat');
 
  // 2. Kategori jasa (contoh awal — bisa ditambah dari dashboard)
  const categories = [
    { id: 'cat_001', name: 'Servis AC', icon: '❄️', is_active: true },
    { id: 'cat_002', name: 'Instalasi Listrik', icon: '⚡', is_active: true },
    { id: 'cat_003', name: 'Perbaikan Plumbing', icon: '🔧', is_active: true },
  ];
  for (const cat of categories) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'categories', cat.id), {
      ...cat, tenant_id: TENANT_ID, created_at: new Date().toISOString()
    });
  }
  console.log('✅ 3 kategori berhasil dibuat');
 
  // 3. Kota coverage (contoh awal)
  const cities = [
    { id: 'city_001', name: 'Jakarta Selatan', is_active: true },
    { id: 'city_002', name: 'Jakarta Barat', is_active: true },
    { id: 'city_003', name: 'Tangerang Selatan', is_active: true },
  ];
  for (const city of cities) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'cities', city.id), {
      ...city, tenant_id: TENANT_ID, created_at: new Date().toISOString()
    });
  }
  console.log('✅ 3 kota berhasil dibuat');
 
  console.log('');
  console.log('🎉 SELESAI! Database tenant pertama sudah siap.');
  console.log('Tenant ID:', TENANT_ID);
  process.exit(0);
}
 
seedTenant().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});