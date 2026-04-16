// scripts/seed-tenant.mjs
// Script untuk membuat struktur Firestore dan mengisi data tenant pertama
// Jalankan sekali: node scripts/seed-tenant.mjs
// Diperbarui: Sesi #018 â€” tambah security_login item 9-14, 142-145, 171-174 + message_library item 126-170

import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Baca service account key â€” wajib ada di scripts/serviceAccountKey.json
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ============================================================
// DATA TENANT PERTAMA â€” Bisnis Anda Sendiri
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
  console.log('âœ… Config tenant berhasil dibuat');

  // 2. Kategori jasa (contoh awal â€” bisa ditambah dari dashboard)
  const categories = [
    { id: 'cat_001', name: 'Servis AC', icon: 'â„ï¸', is_active: true },
    { id: 'cat_002', name: 'Instalasi Listrik', icon: 'âš¡', is_active: true },
    { id: 'cat_003', name: 'Perbaikan Plumbing', icon: 'ðŸ”§', is_active: true },
  ];
  for (const cat of categories) {
    await db.doc(`tenants/${TENANT_ID}/categories/${cat.id}`).set(
      { ...cat, tenant_id: TENANT_ID, created_at: new Date().toISOString() },
      { merge: true }
    );
  }
  console.log('âœ… 3 kategori berhasil dibuat');

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
  console.log('âœ… 3 kota berhasil dibuat');

  console.log('');
  console.log('âœ… Tenant pertama selesai.');
}

// ============================================================
// BAGIAN 1: PLATFORM POLICIES
// ============================================================

async function seedPolicies() {
  // ----------------------------------------------------------
  // security_login â€” Kebijakan keamanan login
  // Item 1-8   : dari Sprint 0 (sudah ada sebelumnya)
  // Item 9-14  : BARU Sesi #017 v6 â€” reset counter + progressive lockout + notif superadmin
  // Item 142-145: BARU Sesi #017 v7 â€” GPS mode, GPS timeout, OTP digits, OTP resend cooldown
  // Item 171-174: BARU Sesi #017 v8 â€” password rules
  // ----------------------------------------------------------
  await db.doc('platform_config/policies/security_login/config').set({

    // --- Item 1-8: sudah ada, tidak berubah ---
    require_otp: true,
    require_otp_tenant_can_override: true,
    require_biometric_offer: true,
    require_biometric_offer_tenant_can_override: true,
    max_login_attempts: 5,
    max_login_attempts_tenant_can_override: true,
    lock_duration_minutes: 15,
    lock_duration_minutes_tenant_can_override: true,
    otp_expiry_minutes: 5,
    otp_expiry_minutes_tenant_can_override: false,
    otp_max_attempts: 3,
    otp_max_attempts_tenant_can_override: false,
    trusted_device_days: 30,
    trusted_device_days_tenant_can_override: true,
    session_timeout_minutes: 480,
    session_timeout_minutes_tenant_can_override: true,

    // --- Item 9-14: BARU â€” Reset Counter + Progressive Lockout + Notif SuperAdmin ---
    // Item 9: Aktifkan reset counter login otomatis berdasarkan waktu idle
    login_attempts_reset_enabled: true,
    login_attempts_reset_enabled_tenant_can_override: true,

    // Item 10: Berapa jam idle sebelum counter percobaan login di-reset ke 0
    login_attempts_reset_hours: 24,
    login_attempts_reset_hours_tenant_can_override: true,

    // Item 11: Aktifkan durasi kunci yang makin lama setiap kunci berulang
    progressive_lockout_enabled: false,
    progressive_lockout_enabled_tenant_can_override: true,

    // Item 12: Pengali durasi kunci per kunci berulang (lock ke-2 = lock_duration x multiplier)
    lock_duration_multiplier: 2,
    lock_duration_multiplier_tenant_can_override: true,

    // Item 13: Batas maksimum durasi kunci meskipun progressive terus naik (dalam jam)
    max_lock_duration_hours: 24,
    max_lock_duration_hours_tenant_can_override: true,

    // Item 14: Kirim notifikasi WA ke SuperAdmin setiap ada akun yang dikunci
    notify_superadmin_on_lock: true,
    notify_superadmin_on_lock_tenant_can_override: false,

    // --- Item 142-145: BARU â€” GPS + OTP Config ---
    // Item 142: Mode GPS saat login (required / optional / disabled)
    gps_mode: 'required',
    gps_mode_tenant_can_override: false,

    // Item 143: Timeout GPS dalam detik â€” sebelum dianggap gagal
    gps_timeout_seconds: 10,
    gps_timeout_seconds_tenant_can_override: true,

    // Item 144: Panjang kode OTP yang dikirim ke WA (4, 6, atau 8 digit)
    otp_digits: 6,
    otp_digits_tenant_can_override: false,

    // Item 145: Jeda detik sebelum user boleh kirim ulang OTP
    otp_resend_cooldown_seconds: 60,
    otp_resend_cooldown_seconds_tenant_can_override: true,

    // --- Item 171-174: BARU â€” Password Rules ---
    // Nilai default mengikuti implementasi yang sudah berjalan (min 8, tanpa kombinasi).
    // Perubahan ke min 12 + kombinasi dicatat sebagai Issue Tertunda â€” diupdate setelah semua TC + RBAC lulus.

    // Item 171: Panjang minimum password (karakter)
    password_min_length: 8,
    password_min_length_tenant_can_override: false,

    // Item 172: Password wajib mengandung huruf besar
    password_require_uppercase: false,
    password_require_uppercase_tenant_can_override: false,

    // Item 173: Password wajib mengandung angka
    password_require_number: false,
    password_require_number_tenant_can_override: false,

    // Item 174: Password wajib mengandung simbol
    password_require_symbol: false,
    password_require_symbol_tenant_can_override: false,

  }, { merge: true });
  console.log('  âœ… security_login â€” 26 field (14 baru: item 9-14, 142-145, 171-174)');

  // ----------------------------------------------------------
  // concurrent_session â€” Kebijakan sesi paralel
  // ----------------------------------------------------------
  await db.doc('platform_config/policies/concurrent_session/config').set({
    scope: 'per_tenant',
    scope_tenant_can_override: false,
    default_rule: 'different_role_only',
    default_rule_tenant_can_override: true,
  }, { merge: true });
  console.log('  âœ… concurrent_session');

  // ----------------------------------------------------------
  // commission â€” Kebijakan komisi transaksi
  // ----------------------------------------------------------
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
  console.log('  âœ… commission');

  // ----------------------------------------------------------
  // timers â€” Kebijakan durasi setiap tahap reverse auction
  // ----------------------------------------------------------
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
  console.log('  âœ… timers');

  // ----------------------------------------------------------
  // activity_logging â€” Kebijakan pencatatan aktivitas
  // ----------------------------------------------------------
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
  console.log('  âœ… activity_logging');
}

// ============================================================
// BAGIAN 2: CONFIG REGISTRY â€” MESSAGE LIBRARY
// ============================================================

async function seedConfigRegistry() {
  // ----------------------------------------------------------
  // message_library â€” Semua template pesan platform
  //
  // Item 120-125 : Vendor registration flow (sudah ada)
  // Item 126     : OTP login WA
  // Item 127-128 : Account lock â€” notif WA ke user + SuperAdmin
  // Item 146     : Account lock â€” pesan UI browser
  // Item 147-150 : GPS denied messages
  // Item 151-159 : Login flow messages
  // Item 160-166 : Login UI text (header, footer, loading)
  // Item 167-170 : Label role di dropdown selector
  // ----------------------------------------------------------
  await db.doc('platform_config/config_registry/items/message_library').set({
    config_id: 'message_library',
    label: 'Perpustakaan Pesan',
    category: 'komunikasi',
    sprint: 1,
    updated_at: new Date().toISOString(),

    // --- Item 120-125: Vendor Registration Flow ---
    vendor_register_pending: 'Terima kasih {{nama}}, pendaftaran Vendor Anda sudah kami terima. Tunggu verifikasi dari Admin. Hubungi: admin@mediator.com',
    admin_vendor_pending_notif: 'Ada pendaftaran Vendor baru. Lakukan verifikasi di Dashboard â†’ Menu Pendaftaran Vendor.',
    vendor_register_review: 'Pendaftaran Anda sedang di-review Admin. Pastikan No WA aktif agar Admin dapat verifikasi. Hubungi: admin@mediator.com',
    vendor_approved_wa: 'Pendaftaran disetujui. Buka email Anda untuk aktivasi akun. Login dengan akun yang didaftarkan. Hubungi: admin@mediator.com',
    vendor_approved_email: 'Pendaftaran disetujui. Lakukan aktivasi akun. Login dengan akun dan password yang didaftarkan. Hubungi: admin@mediator.com',
    vendor_rejected: 'Maaf {{nama}}, pendaftaran Vendor Anda belum dapat kami setujui saat ini. Hubungi kami untuk informasi lebih lanjut.',

    // --- Item 126: OTP Login WA ---
    // Dikirim ke Vendor & Admin saat login â€” Customer TIDAK mendapat OTP
    // Variables: {{kode}}, {{role}}, {{jam}}, {{tanggal}}
    otp_login: 'OTP Anda {{kode}} untuk akses masuk sebagai Role: {{role}}. JANGAN BERIKAN OTP KEPADA SIAPAPUN. Gunakan sebelum Jam: {{jam}} Tanggal {{tanggal}}',

    // --- Item 127: Notifikasi WA ke User saat Akun Dikunci ---
    // Variables: {{nama}}, {{jam_unlock}}, {{jumlah_percobaan}}, {{email_superadmin}}
    account_locked_user: `Halo {{nama}},

Akun Anda di ERP Mediator dikunci karena terlalu banyak percobaan login yang gagal ({{jumlah_percobaan}} percobaan).

Akun akan terbuka kembali pada pukul {{jam_unlock}} WIB.

Jika bukan Anda yang mencoba login, segera hubungi kami:
{{email_superadmin}}

Abaikan pesan ini jika ini memang Anda.`,

    // --- Item 128: Notifikasi WA ke SuperAdmin saat Ada Akun Dikunci ---
    // Variables: {{nama_user}}, {{email_user}}, {{waktu_kejadian}}, {{jumlah_percobaan}}, {{jam_unlock}}
    account_locked_superadmin: `[ALERT KEAMANAN] Akun Dikunci

Nama user  : {{nama_user}}
Email      : {{email_user}}
Waktu      : {{waktu_kejadian}} WIB
Percobaan  : {{jumlah_percobaan}} kali gagal
Dikunci s/d: {{jam_unlock}} WIB

Cek dashboard untuk detail dan unlock manual jika diperlukan.`,

    // --- Item 146: Pesan UI Browser saat Akun Dikunci ---
    // Variables: {{jam_unlock}}
    account_locked_ui: 'Terlalu banyak percobaan. Akun dikunci hingga pukul {{jam_unlock}} WIB. Coba lagi nanti.',

    // --- Item 147-150: GPS Denied Messages ---
    gps_checking_text: 'Sedang memeriksa lokasi Anda...',
    gps_denied_title: 'Izin Lokasi Diperlukan',
    gps_denied_body: 'Platform ini memerlukan akses lokasi untuk keamanan akun Anda. Aktifkan izin lokasi di browser, lalu muat ulang halaman.',
    gps_denied_button: 'Muat Ulang Halaman',

    // --- Item 151-159: Login Flow Messages ---
    // Item 151: Vendor belum approved â€” Variables: {{email_superadmin}}
    vendor_pending_login: 'Akun Anda sedang menunggu verifikasi dari Admin. Kami akan menghubungi Anda via WhatsApp setelah proses selesai. Pertanyaan? Hubungi: {{email_superadmin}}',

    // Item 152: Concurrent session warning â€” Variables: {{device}}, {{gps_kota}}, {{login_time}}
    concurrent_session_warning: 'Akun Anda sedang digunakan di perangkat {{device}} ({{gps_kota}}). Login pada: {{login_time}} WIB. Pastikan Anda yang menggunakannya, silakan minta pengguna tersebut logout terlebih dahulu agar Anda dapat login kembali.',

    // Item 153: Kredensial salah
    login_error_credentials: 'Email atau password yang Anda masukkan salah.',

    // Item 154: Kode OTP salah â€” Variables: {{sisa_percobaan}}
    login_error_otp_wrong: 'Kode OTP salah. Sisa percobaan: {{sisa_percobaan}}',

    // Item 155: OTP kadaluarsa
    login_error_otp_expired: 'Kode OTP sudah kadaluarsa. Klik Kirim ulang.',

    // Item 156: Koneksi gagal
    login_error_connection: 'Gagal terhubung. Periksa koneksi internet Anda.',

    // Item 157: OTP berhasil dikirim ulang
    login_otp_resend_sent: 'Kode OTP baru telah dikirim ke WhatsApp Anda.',

    // Item 158: Error global â€” judul
    login_error_global_title: 'Terjadi Kesalahan',

    // Item 159: Error global â€” isi
    login_error_global_body: 'Gagal terhubung. Periksa koneksi internet Anda.',

    // --- Item 160-166: Login UI Text (teks statis halaman login) ---
    login_header_title: 'Selamat Datang Kembali',
    login_header_subtitle: 'Masuk untuk melanjutkan',
    login_footer_text: 'Belum punya akun?',
    login_footer_link: 'Daftar Sekarang',
    login_loading_otp: 'Mengirim kode OTP...',
    login_loading_verify: 'Memverifikasi...',
    login_loading_connect: 'Menghubungkan...',

    // --- Item 167-170: Label Role di Dropdown Selector ---
    role_label_customer: 'Pelanggan',
    role_label_vendor: 'Mitra / Vendor',
    role_label_admin_tenant: 'Admin',
    role_label_superadmin: 'Super Admin',

  }, { merge: true });
  console.log('  âœ… message_library â€” 35 item (item 120-128, 146-170)');
}

// ============================================================
// BAGIAN 3: TENANT DEFAULT CONFIG
// ============================================================

async function seedTenantConfig() {
  // Konfigurasi utama tenant â€” policies kosong, diisi oleh Tenant Admin via dashboard
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
  console.log('  âœ… tenant config default');
}

// ============================================================

// ============================================================
// BAGIAN 4: CONFIG SCHEMA
// ============================================================

async function seedConfigSchema() {
  const groups = [
    {
      title: 'Keamanan Login',
      feature_key: 'keamanan_login',
      items: [
        { id: 'max_login_attempts',           label: 'Maks percobaan login',             type: 'number-unit', value: 5,    unit: 'Kali',  units: [],             options: [],                             adminCanChange: true, enabled: true },
        { id: 'lock_duration_minutes',        label: 'Durasi kunci akun',                type: 'number-unit', value: 30,   unit: 'Menit', units: ['Menit','Jam'], options: [],                             adminCanChange: true, enabled: true },
        { id: 'login_attempts_reset_enabled', label: 'Reset counter gagal setelah idle', type: 'number-unit', value: 24,   unit: 'Jam',   units: ['Jam','Hari'],  options: [],                             adminCanChange: true, enabled: true },
        { id: 'progressive_lockout_enabled',  label: 'Progressive lockout',              type: 'toggle',      value: true, unit: '',      units: [],             options: [],                             adminCanChange: false, enabled: true },
        { id: 'max_lock_duration_hours',      label: 'Batas maksimal durasi kunci',      type: 'number-unit', value: 24,   unit: 'Jam',   units: [],             options: [],                             adminCanChange: true, enabled: true },
      ],
    },
    {
      title: 'OTP',
      feature_key: 'otp',
      items: [
        { id: 'require_otp',                 label: 'OTP via WhatsApp aktif',        type: 'toggle',      value: true,      unit: '',      units: [],                options: [],                             adminCanChange: true, enabled: true },
        { id: 'otp_expiry_minutes',          label: 'Durasi OTP expired',            type: 'number-unit', value: 5,         unit: 'Menit', units: ['Menit','Detik'], options: [],                             adminCanChange: true, enabled: true },
        { id: 'otp_digits',                  label: 'Panjang kode OTP',              type: 'select-only', value: '6 Digit', unit: '',      units: [],                options: ['6 Digit','4 Digit','8 Digit'], adminCanChange: true, enabled: true },
        { id: 'otp_max_attempts',            label: 'Maks percobaan OTP salah',      type: 'number-unit', value: 3,         unit: 'Kali',  units: [],                options: [],                             adminCanChange: true, enabled: true },
        { id: 'otp_resend_cooldown_seconds', label: 'Jeda sebelum kirim ulang OTP',  type: 'number-unit', value: 60,        unit: 'Detik', units: ['Detik','Menit'], options: [],                             adminCanChange: true, enabled: true },
      ],
    },
    {
      title: 'Biometric',
      feature_key: 'biometric',
      items: [
        { id: 'require_biometric_offer', label: 'Tawarkan biometric saat login', type: 'toggle',      value: true, unit: '',     units: [],                       options: [], adminCanChange: true, enabled: true },
        { id: 'trusted_device_days',     label: 'Durasi trusted device',         type: 'number-unit', value: 30,   unit: 'Hari', units: ['Hari','Minggu','Bulan'], options: [], adminCanChange: true, enabled: true },
      ],
    },
    {
      title: 'Session & Concurrent',
      feature_key: 'session_concurrent',
      items: [
        { id: 'session_timeout_minutes',   label: 'Durasi JWT token',                    type: 'number-unit', value: 60,      unit: 'Menit', units: ['Menit','Jam'], options: [],                          adminCanChange: true, enabled: true },
        { id: 'session_timeout_inactive',  label: 'Session timeout tidak aktif',         type: 'number-unit', value: 30,      unit: 'Menit', units: ['Menit','Jam'], options: [],                          adminCanChange: true, enabled: true },
        { id: 'concurrent_session_rule',   label: 'Aturan login bersamaan',              type: 'select-only', value: 'Bebas', unit: '',      units: [],             options: ['Bebas','Beda Role','Blokir'], adminCanChange: true, enabled: true },
        { id: 'notify_superadmin_on_lock', label: 'Notif WA ke SuperAdmin saat dikunci', type: 'toggle',      value: true,    unit: '',      units: [],             options: [],                          adminCanChange: true, enabled: true },
      ],
    },
  ]
  await db.doc('platform_config/config_registry/items/security_login').set({
    config_id: 'security_login',
    module_label: 'Keamanan Login',
    groups: groups,
    updated_at: new Date().toISOString(),
  }, { merge: true })
  console.log('  ✅ config_schema — security_login (16 item, 4 group — sesuai HTML approved)')
}


// RUNNER UTAMA â€” jalankan semua fungsi seed secara berurutan
// ============================================================

async function main() {
  console.log('ðŸš€ Mulai seeding database ERP Mediator...');
  console.log('   Versi seed: Sesi #018 â€” security_login + message_library lengkap');
  console.log('');

  await seedTenant();

  console.log('Seeding platform policies...');
  await seedPolicies();
  console.log('âœ… Policies selesai (5 dokumen)');
  console.log('');

  console.log('Seeding config registry...');
  await seedConfigRegistry();

  console.log('Seeding config schema...');
  await seedConfigSchema();
  console.log('✅ Config schema selesai (22 item)');
  console.log('âœ… Config registry selesai (1 dokumen â€” message_library)');
  console.log('');

  console.log('Seeding tenant config...');
  await seedTenantConfig();
  console.log('âœ… Tenant config selesai');
  console.log('');

  console.log('ðŸŽ‰ SELESAI! Seluruh database sudah siap.');
  console.log('Tenant ID:', TENANT_ID);
  process.exit(0);
}

main().catch(err => {
  console.error('âŒ Error:', err.message);
  process.exit(1);
});






