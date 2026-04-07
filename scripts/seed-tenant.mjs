// scripts/seed-tenant.mjs
// Script untuk membuat struktur Firestore dan mengisi data tenant pertama
// Jalankan sekali: node scripts/seed-tenant.mjs

import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Baca service account key — wajib ada di scripts/serviceAccountKey.json
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ============================================================
// DATA TENANT PERTAMA — Bisnis Anda Sendiri
// ============================================================
const TENANT_ID = 'tenant_erpmediator'; // ID unik tenant Anda

async function seedTenant() {
  console.log('Mulai setup database...');

  // 1. Dokumen konfigurasi utama tenant
  await db.doc(`tenants/${TENANT_ID}/config/main`).set({
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
  }, { merge: true });
  console.log('✅ Config tenant berhasil dibuat');

  // 2. Kategori jasa (contoh awal — bisa ditambah dari dashboard)
  const categories = [
    { id: 'cat_001', name: 'Servis AC', icon: '❄️', is_active: true },
    { id: 'cat_002', name: 'Instalasi Listrik', icon: '⚡', is_active: true },
    { id: 'cat_003', name: 'Perbaikan Plumbing', icon: '🔧', is_active: true },
  ];
  for (const cat of categories) {
    await db.doc(`tenants/${TENANT_ID}/categories/${cat.id}`).set(
      { ...cat, tenant_id: TENANT_ID, created_at: new Date().toISOString() },
      { merge: true }
    );
  }
  console.log('✅ 3 kategori berhasil dibuat');

  // 3. Kota coverage (contoh awal)
  const cities = [
    { id: 'city_001', name: 'Jakarta Selatan', is_active: true },
    { id: 'city_002', name: 'Jakarta Barat', is_active: true },
    { id: 'city_003', name: 'Tangerang Selatan', is_active: true },
  ];
  for (const city of cities) {
    await db.doc(`tenants/${TENANT_ID}/cities/${city.id}`).set(
      { ...city, tenant_id: TENANT_ID, created_at: new Date().toISOString() },
      { merge: true }
    );
  }
  console.log('✅ 3 kota berhasil dibuat');

  console.log('');
  console.log('✅ Tenant pertama selesai.');
}

// ============================================================
// BAGIAN 1: PLATFORM POLICIES
// ============================================================

async function seedPolicies() {
  // Kebijakan keamanan login — max attempts, OTP, biometric, session timeout
  await db.doc('platform_config/policies/security_login/config').set({
    max_login_attempts: 5,
    max_login_attempts_tenant_can_override: true,
    lock_duration_minutes: 15,
    lock_duration_minutes_tenant_can_override: true,
    require_otp: true,
    require_otp_tenant_can_override: true,
    require_biometric_offer: true,
    require_biometric_offer_tenant_can_override: true,
    session_timeout_minutes: 480,
    session_timeout_minutes_tenant_can_override: true,
    otp_expiry_minutes: 5,
    otp_expiry_minutes_tenant_can_override: false,
    otp_max_attempts: 3,
    otp_max_attempts_tenant_can_override: false,
    trusted_device_days: 30,
    trusted_device_days_tenant_can_override: true,
  }, { merge: true });

  // Kebijakan sesi paralel — scope dan aturan login dari beberapa perangkat
  await db.doc('platform_config/policies/concurrent_session/config').set({
    scope: 'per_tenant',
    scope_tenant_can_override: false,
    default_rule: 'different_role_only',
    default_rule_tenant_can_override: true,
  }, { merge: true });

  // Kebijakan komisi transaksi — tipe, rate, flat fee, batas minimum/maksimum
  await db.doc('platform_config/policies/commission/config').set({
    default_type: 'percent',
    default_type_tenant_can_override: true,
    default_rate: 10,
    default_rate_tenant_can_override: true,
    minimum_amount_rp: 50000,
    minimum_amount_rp_tenant_can_override: false,
    max_per_transaction_rp: 0,
    max_per_transaction_rp_tenant_can_override: true,
    flat_fee_per_order_rp: 0,
    flat_fee_per_order_rp_tenant_can_override: true,
    charged_to: 'customer',
    charged_to_tenant_can_override: true,
  }, { merge: true });

  // Kebijakan timer durasi setiap tahap dalam proses reverse auction
  await db.doc('platform_config/policies/timers/config').set({
    t_bid_minutes: 15,
    t_bid_minutes_tenant_can_override: true,
    t_approval_minutes: 60,
    t_approval_minutes_tenant_can_override: true,
    t_payment_minutes: 60,
    t_payment_minutes_tenant_can_override: true,
    t_work_minutes: 1440,
    t_work_minutes_tenant_can_override: true,
    t_review_minutes: 120,
    t_review_minutes_tenant_can_override: true,
    t_dispute_minutes: 1440,
    t_dispute_minutes_tenant_can_override: true,
    t_vendor_approval_minutes: 2880,
    t_vendor_approval_minutes_tenant_can_override: true,
    t_otp_minutes: 5,
    t_otp_minutes_tenant_can_override: false,
  }, { merge: true });

  // Kebijakan pencatatan aktivitas — apa yang dicatat dan berapa lama disimpan
  await db.doc('platform_config/policies/activity_logging/config').set({
    log_page_views: true,
    log_page_views_tenant_can_override: true,
    log_button_clicks: false,
    log_button_clicks_tenant_can_override: true,
    log_form_submits: true,
    log_form_submits_tenant_can_override: false,
    log_errors: true,
    log_errors_tenant_can_override: false,
    retention_days: 365,
    retention_days_tenant_can_override: true,
    max_retention_days: 730,
  }, { merge: true });
}

// ============================================================
// BAGIAN 2: CONFIG REGISTRY — MESSAGE LIBRARY
// ============================================================

async function seedConfigRegistry() {
  // Template pesan WhatsApp untuk berbagai event platform
  await db.doc('platform_config/settings/config_registry/message_library').set({
    config_id: 'message_library',
    label: 'Perpustakaan Pesan',
    category: 'komunikasi',
    sprint: 1,
    otp_wa: 'OTP Anda {kode} untuk akses masuk sebagai Role: {role}. JANGAN BERIKAN OTP KEPADA SIAPAPUN. Gunakan sebelum Jam: {jam} Tanggal {tanggal}',
    vendor_pending: 'Terima kasih {nama}, pendaftaran Vendor Anda sedang kami review. Kami akan menghubungi Anda dalam {durasi} jam kerja.',
    vendor_approved: 'Selamat {nama}! Akun Vendor Anda telah diaktifkan. Silakan login di {url}',
    vendor_rejected: 'Maaf {nama}, pendaftaran Vendor Anda belum dapat kami setujui. Hubungi kami di {kontak} untuk informasi lebih lanjut.',
    order_baru_vendor: 'Ada order baru menunggu penawaran Anda! Order #{order_id} - {nama_layanan} di {kota}. Segera buka aplikasi untuk melihat detail.',
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

// ============================================================
// BAGIAN 3: TENANT DEFAULT CONFIG
// ============================================================

async function seedTenantConfig() {
  // Konfigurasi utama tenant — policies kosong, diisi oleh Tenant Admin via dashboard
  await db.doc(`tenants/${TENANT_ID}/config/main`).set({
    tenant_id: TENANT_ID,
    brand_name: 'ERP Mediator',
    token_version: 1,
    policies: {},
    setup: {
      concurrent_session_configured: false,
      commission_configured: false,
      timers_configured: false,
    },
    created_at: new Date().toISOString(),
  }, { merge: true });
}

// ============================================================
// RUNNER UTAMA — jalankan semua fungsi seed secara berurutan
// ============================================================

async function main() {
  console.log('🚀 Mulai seeding database ERP Mediator...');
  console.log('');

  await seedTenant();

  console.log('Seeding platform policies...');
  await seedPolicies();
  console.log('✅ Policies selesai (5 dokumen)');

  console.log('Seeding config registry...');
  await seedConfigRegistry();
  console.log('✅ Config registry selesai (1 dokumen)');

  console.log('Seeding tenant config...');
  await seedTenantConfig();
  console.log('✅ Tenant config selesai (1 dokumen)');

  console.log('');
  console.log('🎉 SELESAI! Seluruh database sudah siap.');
  console.log('Tenant ID:', TENANT_ID);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
