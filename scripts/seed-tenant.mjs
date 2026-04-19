// scripts/seed-tenant.mjs
// Script seed untuk PostgreSQL via Supabase
// Jalankan: node scripts/seed-tenant.mjs
//
// PRASYARAT: Jalankan scripts/setup-all-tables.sql di Supabase Dashboard dulu
//
// Yang di-seed:
//   1. Tenant
//   2. Platform Policies
//   3. Config Registry (16 item security_login)
//   4. Message Library (23 pesan: login_ui + otp_ui + notif_wa)
//   5. Service Providers (8 provider API)
//   6. Provider Field Definitions (33 field total)

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const envPath    = join(__dirname, '..', '.env.development.local')
const envContent = readFileSync(envPath, 'utf-8')

const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const key = trimmed.slice(0, idx).trim()
  const val = trimmed.slice(idx + 1).trim()
  env[key] = val
}

const SUPABASE_URL         = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

// ============================================================
// BAGIAN 1: TENANT
// ============================================================

async function seedTenant() {
  const { error } = await db
    .from('tenants')
    .upsert({
      id:            TENANT_ID,
      nama_brand:    'ERP Mediator',
      domain:        'erpmediator.com',
      status:        'aktif',
      token_version: 1,
      created_at:    new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'id' })
  if (error) throw new Error(`seedTenant: ${error.message}`)
  console.log('  ✅ Tenant: ERP Mediator')
}

// ============================================================
// BAGIAN 2: PLATFORM POLICIES
// ============================================================

async function seedPolicies() {
  const policies = [
    {
      feature_key: 'security_login',
      nilai: {
        require_otp: true, require_otp_tenant_can_override: true,
        require_biometric_offer: true, require_biometric_offer_tenant_can_override: true,
        max_login_attempts: 5, max_login_attempts_tenant_can_override: true,
        lock_duration_minutes: 15, lock_duration_minutes_tenant_can_override: true,
        otp_expiry_minutes: 5, otp_expiry_minutes_tenant_can_override: false,
        otp_max_attempts: 3, otp_max_attempts_tenant_can_override: false,
        trusted_device_days: 30, trusted_device_days_tenant_can_override: true,
        session_timeout_minutes: 480, session_timeout_minutes_tenant_can_override: true,
        login_attempts_reset_enabled: true, login_attempts_reset_hours: 24,
        progressive_lockout_enabled: false, lock_duration_multiplier: 2,
        max_lock_duration_hours: 24, notify_superadmin_on_lock: true,
        gps_mode: 'required', gps_timeout_seconds: 10,
        otp_digits: 6, otp_resend_cooldown_seconds: 60,
        password_min_length: 8, password_require_uppercase: false,
        password_require_number: false, password_require_symbol: false,
      }
    },
    {
      feature_key: 'concurrent_session',
      nilai: {
        scope: 'per_tenant', scope_tenant_can_override: false,
        rule: 'different_role_only', rule_tenant_can_override: true,
      }
    },
    {
      feature_key: 'commission',
      nilai: {
        percentage: 10, minimum_amount: 50000, charged_to: 'customer',
        charged_to_tenant_can_override: true, percentage_tenant_can_override: true,
        minimum_amount_tenant_can_override: false,
      }
    },
    {
      feature_key: 'timers',
      nilai: {
        t1_minutes: 15, t1_minutes_tenant_can_override: true,
        t2_minutes: 60, t2_minutes_tenant_can_override: true,
        t3_minutes: 120, t3_minutes_tenant_can_override: true,
      }
    },
    {
      feature_key: 'activity_logging',
      nilai: {
        log_page_views: true, log_page_views_tenant_can_override: true,
        log_button_clicks: false, log_button_clicks_tenant_can_override: true,
        log_form_submits: true, log_form_submits_tenant_can_override: false,
        log_errors: true, log_errors_tenant_can_override: false,
        retention_days: 365, retention_days_tenant_can_override: true,
      }
    },
  ]
  for (const policy of policies) {
    const { error } = await db.from('platform_policies')
      .upsert({ feature_key: policy.feature_key, nilai: policy.nilai, updated_at: new Date().toISOString() }, { onConflict: 'feature_key' })
    if (error) throw new Error(`seedPolicies ${policy.feature_key}: ${error.message}`)
    console.log(`  ✅ Policy: ${policy.feature_key}`)
  }
}

// ============================================================
// BAGIAN 3: CONFIG REGISTRY
// ============================================================

async function seedConfigRegistry() {
  const { error: delError } = await db
    .from('config_registry').delete().eq('feature_key', 'security_login').is('tenant_id', null)
  if (delError) throw new Error(`seedConfigRegistry delete: ${delError.message}`)

  const items = [
    { label: 'Maks percobaan login',                kategori: 'Keamanan Login',       nilai: '5',                   tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Durasi kunci akun (menit)',            kategori: 'Keamanan Login',       nilai: '30',                  tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Reset counter gagal setelah idle',     kategori: 'Keamanan Login',       nilai: '24',                  tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Progressive lockout',                  kategori: 'Keamanan Login',       nilai: 'true',                tipe_data: 'boolean', akses_baca: ['superadmin'],         akses_ubah: ['superadmin'],         nilai_enum: null },
    { label: 'Batas maksimal durasi kunci (jam)',    kategori: 'Keamanan Login',       nilai: '24',                  tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'OTP via WhatsApp aktif',               kategori: 'OTP',                  nilai: 'true',                tipe_data: 'boolean', akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Durasi OTP expired (menit)',           kategori: 'OTP',                  nilai: '5',                   tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Panjang kode OTP',                     kategori: 'OTP',                  nilai: '6',                   tipe_data: 'select',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: ['4','6','8'] },
    { label: 'Maks percobaan OTP salah',             kategori: 'OTP',                  nilai: '3',                   tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Jeda sebelum kirim ulang OTP (detik)', kategori: 'OTP',                  nilai: '60',                  tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Tawarkan biometric saat login',        kategori: 'Biometric',            nilai: 'true',                tipe_data: 'boolean', akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Durasi trusted device (hari)',         kategori: 'Biometric',            nilai: '30',                  tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Durasi session timeout (menit)',       kategori: 'Session & Concurrent', nilai: '480',                 tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Session timeout tidak aktif (menit)', kategori: 'Session & Concurrent', nilai: '30',                  tipe_data: 'number',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
    { label: 'Aturan login bersamaan',               kategori: 'Session & Concurrent', nilai: 'different_role_only', tipe_data: 'select',  akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: ['none','different_role_only','always'] },
    { label: 'Notif WA ke SuperAdmin saat dikunci',  kategori: 'Session & Concurrent', nilai: 'true',                tipe_data: 'boolean', akses_baca: ['superadmin','admin'], akses_ubah: ['superadmin','admin'], nilai_enum: null },
  ]

  const rows = items.map(item => ({
    feature_key: 'security_login', tenant_id: null, label: item.label,
    kategori: item.kategori, nilai: item.nilai, tipe_data: item.tipe_data,
    akses_baca: item.akses_baca, akses_ubah: item.akses_ubah,
    nilai_enum: item.nilai_enum, is_active: true, updated_at: new Date().toISOString(),
  }))

  const { error } = await db.from('config_registry').insert(rows)
  if (error) throw new Error(`seedConfigRegistry insert: ${error.message}`)
  console.log(`  ✅ Config Registry: 16 item security_login`)
}

// ============================================================
// BAGIAN 4: MESSAGE LIBRARY
// ============================================================

async function seedMessageLibrary() {
  // Hapus semua data lama agar idempotent
  await db.from('message_library').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const messages = [
    // ── login_ui: 17 pesan error + validasi form login ──────────────────────
    { key: 'login_error_credentials_salah',       kategori: 'login_ui', channel: 'ui', teks: 'Email atau password yang Anda masukkan salah.',         variabel: [], keterangan: 'Supabase error: Invalid login credentials / User not found' },
    { key: 'login_error_email_belum_konfirmasi',  kategori: 'login_ui', channel: 'ui', teks: 'Email belum dikonfirmasi. Hubungi admin.',               variabel: [], keterangan: 'Supabase error: Email not confirmed' },
    { key: 'login_error_terlalu_banyak_percobaan',kategori: 'login_ui', channel: 'ui', teks: 'Terlalu banyak percobaan. Coba lagi beberapa menit.',    variabel: [], keterangan: 'Supabase rate limit (bukan account_locks platform)' },
    { key: 'login_error_koneksi_gagal',           kategori: 'login_ui', channel: 'ui', teks: 'Gagal terhubung. Periksa koneksi internet.',             variabel: [], keterangan: 'Network error saat request ke Supabase' },
    { key: 'login_error_umum',                    kategori: 'login_ui', channel: 'ui', teks: 'Terjadi kesalahan. Coba lagi.',                          variabel: [], keterangan: 'Fallback generik saat tidak ada pesan spesifik' },
    { key: 'login_error_gps_diperlukan',          kategori: 'login_ui', channel: 'ui', teks: 'Aktifkan GPS di browser untuk melanjutkan. Klik ikon lokasi di address bar, lalu izinkan akses lokasi.', variabel: [], keterangan: 'User klik Masuk tapi GPS belum diizinkan (gps_mode = required)' },
    { key: 'login_error_config_belum_lengkap',    kategori: 'login_ui', channel: 'ui', teks: 'Konfigurasi akun belum lengkap. Hubungi admin.',         variabel: [], keterangan: 'JWT tidak memiliki tenant_id (bukan SUPERADMIN)' },
    { key: 'login_error_role_tidak_ditemukan',    kategori: 'login_ui', channel: 'ui', teks: 'Role akun tidak ditemukan. Hubungi admin.',              variabel: [], keterangan: 'user_profiles tidak punya role atau JWT tidak ada app_role' },
    { key: 'login_error_akun_belum_aktif',        kategori: 'login_ui', channel: 'ui', teks: 'Akun Anda belum diaktifkan. Tunggu verifikasi dari Admin.',variabel: [], keterangan: 'Vendor dengan status PENDING atau REVIEW' },
    { key: 'login_error_gagal_muat_data',         kategori: 'login_ui', channel: 'ui', teks: 'Gagal memuat data akun. Coba lagi.',                     variabel: [], keterangan: 'Query user_profiles ke Supabase gagal' },
    { key: 'login_error_gagal_config',            kategori: 'login_ui', channel: 'ui', teks: 'Gagal memuat konfigurasi. Coba lagi.',                   variabel: [], keterangan: 'Query platform_policies setelah login berhasil gagal' },
    { key: 'login_error_gagal_selesaikan',        kategori: 'login_ui', channel: 'ui', teks: 'Gagal menyelesaikan login. Coba lagi.',                  variabel: [], keterangan: 'selesaiLogin() gagal (session log, cookie, presence)' },
    { key: 'login_error_akun_dikunci',            kategori: 'login_ui', channel: 'ui', teks: 'Terlalu banyak percobaan. Akun dikunci hingga pukul {lock_until_wib}.', variabel: ['lock_until_wib'], keterangan: 'check-lock atau lock-account return locked: true' },
    { key: 'login_validasi_email_kosong',         kategori: 'login_ui', channel: 'ui', teks: 'Email wajib diisi.',                                     variabel: [], keterangan: 'Validasi client-side: field email kosong' },
    { key: 'login_validasi_email_format',         kategori: 'login_ui', channel: 'ui', teks: 'Format email tidak valid.',                              variabel: [], keterangan: 'Validasi client-side: email tidak mengandung @ atau domain' },
    { key: 'login_validasi_password_kosong',      kategori: 'login_ui', channel: 'ui', teks: 'Password wajib diisi.',                                  variabel: [], keterangan: 'Validasi client-side: field password kosong' },
    { key: 'login_validasi_password_min',         kategori: 'login_ui', channel: 'ui', teks: 'Password minimal 8 karakter.',                           variabel: [], keterangan: 'Validasi client-side: password < 8 karakter' },

    // ── otp_ui: 5 pesan tahap verifikasi OTP ────────────────────────────────
    { key: 'otp_error_kurang_digit',      kategori: 'otp_ui', channel: 'ui', teks: 'Masukkan 6 digit kode OTP.',                      variabel: [], keterangan: 'Input OTP kurang dari 6 digit' },
    { key: 'otp_error_kadaluarsa',        kategori: 'otp_ui', channel: 'ui', teks: 'Kode OTP sudah kadaluarsa. Klik Kirim ulang.',    variabel: [], keterangan: 'verifyOTP() return EXPIRED' },
    { key: 'otp_error_salah',             kategori: 'otp_ui', channel: 'ui', teks: 'Kode OTP salah. Sisa percobaan: {sisa_percobaan}.', variabel: ['sisa_percobaan'], keterangan: 'OTP salah, masih ada sisa percobaan' },
    { key: 'otp_error_batas_habis',       kategori: 'otp_ui', channel: 'ui', teks: 'Batas percobaan OTP habis. Klik Kirim ulang.',    variabel: [], keterangan: 'Percobaan OTP mencapai otp_max_attempts' },
    { key: 'otp_error_verifikasi_gagal',  kategori: 'otp_ui', channel: 'ui', teks: 'Gagal memverifikasi OTP. Coba lagi.',             variabel: [], keterangan: 'verifyOTP() throw error (network atau server)' },

    // ── notif_wa: 1 template WhatsApp via Fonnte ─────────────────────────────
    {
      key:        'notif_wa_akun_dikunci',
      kategori:   'notif_wa',
      channel:    'wa',
      teks:       'Halo {nama},\n\nAkun Anda di {nama_platform} dikunci karena terlalu banyak percobaan login yang gagal ({max_login_attempts} percobaan).\n\nAkun akan terbuka kembali pada pukul {lock_until_wib} WIB.\n\nJika bukan Anda yang mencoba login, segera hubungi SuperAdmin:\n{superadmin_email}\n\nAbaikan pesan ini jika ini memang Anda.',
      variabel:   ['nama', 'nama_platform', 'max_login_attempts', 'lock_until_wib', 'superadmin_email'],
      keterangan: 'Dikirim via Fonnte saat akun user dikunci karena percobaan login gagal berulang',
    },
  ]

  const rows = messages.map(m => ({
    key: m.key, kategori: m.kategori, channel: m.channel,
    teks: m.teks, variabel: m.variabel, keterangan: m.keterangan,
    is_active: true, updated_at: new Date().toISOString(),
  }))

  const { error } = await db.from('message_library').insert(rows)
  if (error) throw new Error(`seedMessageLibrary: ${error.message}`)
  console.log(`  ✅ Message Library: 23 pesan (login_ui: 17, otp_ui: 5, notif_wa: 1)`)
}

// ============================================================
// BAGIAN 5: SERVICE PROVIDERS (Katalog semua API)
// ============================================================

async function seedServiceProviders() {
  // Upsert berdasarkan kode — idempotent
  const providers = [
    { kode: 'supabase',   nama: 'Supabase',          kategori: 'database',  deskripsi: 'Database PostgreSQL + Auth + Realtime + Storage utama platform',  docs_url: 'https://supabase.com/dashboard',       status_url: 'https://status.supabase.com',      tag: 'wajib',      sort_order: 1 },
    { kode: 'upstash',    nama: 'Upstash Redis',      kategori: 'cache',     deskripsi: 'Cache data panas dan rate limiting di Vercel Edge Runtime',        docs_url: 'https://console.upstash.com',          status_url: 'https://status.upstash.com',       tag: 'disarankan', sort_order: 2 },
    { kode: 'typesense',  nama: 'Typesense',          kategori: 'search',    deskripsi: 'Search engine hyperlocal — vendor, jasa, dan lokasi',              docs_url: 'https://cloud.typesense.org',          status_url: 'https://cloud.typesense.org',      tag: 'disarankan', sort_order: 3 },
    { kode: 'cloudinary', nama: 'Cloudinary',         kategori: 'media',     deskripsi: 'Storage CDN untuk foto profil, portofolio, dan video vendor',      docs_url: 'https://cloudinary.com/console',       status_url: 'https://status.cloudinary.com',    tag: 'wajib',      sort_order: 4 },
    { kode: 'xendit',     nama: 'Xendit',             kategori: 'payment',   deskripsi: 'Payment gateway Indonesia — QRIS, Virtual Account, e-wallet',      docs_url: 'https://dashboard.xendit.co',          status_url: 'https://status.xendit.co',         tag: 'wajib',      sort_order: 5 },
    { kode: 'fonnte',     nama: 'Fonnte WhatsApp',    kategori: 'messaging', deskripsi: 'WhatsApp API untuk OTP login dan notifikasi transaksi',            docs_url: 'https://app.fonnte.com',               status_url: 'https://app.fonnte.com',           tag: 'wajib',      sort_order: 6 },
    { kode: 'smtp',       nama: 'SMTP Email',         kategori: 'email',     deskripsi: 'Email untuk notifikasi dan reset password cadangan',               docs_url: null,                                   status_url: null,                               tag: 'opsional',   sort_order: 7 },
    { kode: 'cloudflare', nama: 'Cloudflare',         kategori: 'cdn',       deskripsi: 'CDN dan WAF untuk keamanan, performa, dan DDoS protection',        docs_url: 'https://dash.cloudflare.com',          status_url: 'https://www.cloudflarestatus.com', tag: 'disarankan', sort_order: 8 },
  ]

  for (const p of providers) {
    const { error } = await db.from('service_providers')
      .upsert({ ...p, is_aktif: true, created_at: new Date().toISOString() }, { onConflict: 'kode' })
    if (error) throw new Error(`seedServiceProviders [${p.kode}]: ${error.message}`)
    console.log(`  ✅ Provider: ${p.nama} (${p.kategori}) — ${p.tag}`)
  }
}

// ============================================================
// BAGIAN 6: PROVIDER FIELD DEFINITIONS
// ============================================================

async function seedProviderFieldDefinitions() {
  // Ambil semua provider ID sekali
  const { data: providers, error: pErr } = await db
    .from('service_providers').select('id, kode')
  if (pErr) throw new Error(`Gagal ambil provider IDs: ${pErr.message}`)

  const pid = {}
  for (const p of providers) pid[p.kode] = p.id

  // Hapus field definitions lama — akan di-insert ulang
  const { error: delErr } = await db
    .from('provider_field_definitions').delete()
    .in('provider_id', Object.values(pid))
  if (delErr) throw new Error(`seedProviderFieldDefinitions delete: ${delErr.message}`)

  const fields = [
    // ── SUPABASE ──────────────────────────────────────────────────────────────
    { kode: 'supabase', field_key: 'project_url',      label: 'URL Project',         tipe: 'url',    is_required: true,  is_secret: false, placeholder: 'https://xxx.supabase.co',      deskripsi: 'URL project Supabase kamu',                     deep_link_url: 'https://supabase.com/dashboard/project/_/settings/api', sort_order: 1 },
    { kode: 'supabase', field_key: 'anon_key',         label: 'Anon / Public Key',   tipe: 'text',   is_required: true,  is_secret: false, placeholder: 'eyJhbGci...',                  deskripsi: 'Public key — aman dipakai di browser',          deep_link_url: 'https://supabase.com/dashboard/project/_/settings/api', sort_order: 2 },
    { kode: 'supabase', field_key: 'service_role_key', label: 'Service Role Key',    tipe: 'secret', is_required: true,  is_secret: true,  placeholder: 'eyJhbGci...',                  deskripsi: 'Key akses penuh — JANGAN expose ke browser',    deep_link_url: 'https://supabase.com/dashboard/project/_/settings/api', sort_order: 3 },
    { kode: 'supabase', field_key: 'jwt_secret',       label: 'JWT Secret',          tipe: 'secret', is_required: true,  is_secret: true,  placeholder: null,                           deskripsi: 'Secret untuk verifikasi JWT',                   deep_link_url: 'https://supabase.com/dashboard/project/_/settings/api', sort_order: 4 },

    // ── UPSTASH REDIS ─────────────────────────────────────────────────────────
    { kode: 'upstash',  field_key: 'rest_url',   label: 'REST URL',   tipe: 'url',    is_required: true, is_secret: false, placeholder: 'https://xxx.upstash.io', deskripsi: 'URL endpoint REST Redis Upstash',        deep_link_url: 'https://console.upstash.com', sort_order: 1 },
    { kode: 'upstash',  field_key: 'rest_token', label: 'REST Token', tipe: 'secret', is_required: true, is_secret: true,  placeholder: 'AYxxxxxx...',            deskripsi: 'Token autentikasi REST API Upstash',     deep_link_url: 'https://console.upstash.com', sort_order: 2 },

    // ── TYPESENSE ─────────────────────────────────────────────────────────────
    { kode: 'typesense', field_key: 'host',           label: 'Host / IP Server',    tipe: 'text',   is_required: true, is_secret: false, placeholder: 'xxx.typesense.net',    deskripsi: 'Alamat server Typesense',               deep_link_url: null, sort_order: 1 },
    { kode: 'typesense', field_key: 'port',           label: 'Port',                tipe: 'number', is_required: true, is_secret: false, placeholder: '8108',                 deskripsi: 'Port server Typesense',                 deep_link_url: null, nilai_default: '8108', sort_order: 2 },
    { kode: 'typesense', field_key: 'protocol',       label: 'Protokol',            tipe: 'select', is_required: true, is_secret: false, placeholder: null,                   deskripsi: 'Gunakan https untuk production',        deep_link_url: null, nilai_default: 'https', options: JSON.stringify([{value:'https',label:'HTTPS (Aman)'},{value:'http',label:'HTTP'}]), sort_order: 3 },
    { kode: 'typesense', field_key: 'admin_api_key',  label: 'Admin API Key',       tipe: 'secret', is_required: true, is_secret: true,  placeholder: 'xyz123...',            deskripsi: 'Key akses penuh — untuk server saja',   deep_link_url: null, sort_order: 4 },
    { kode: 'typesense', field_key: 'search_api_key', label: 'Search-Only API Key', tipe: 'text',   is_required: true, is_secret: false, placeholder: 'abc456...',            deskripsi: 'Key hanya untuk pencarian — aman di browser', deep_link_url: null, sort_order: 5 },

    // ── CLOUDINARY ────────────────────────────────────────────────────────────
    { kode: 'cloudinary', field_key: 'cloud_name', label: 'Cloud Name', tipe: 'text',   is_required: true, is_secret: false, placeholder: 'erp-mediator',       deskripsi: 'Nama unik cloud Cloudinary',        deep_link_url: 'https://cloudinary.com/console', sort_order: 1 },
    { kode: 'cloudinary', field_key: 'api_key',    label: 'API Key',    tipe: 'text',   is_required: true, is_secret: false, placeholder: '123456789012345',    deskripsi: 'API Key Cloudinary',                deep_link_url: 'https://cloudinary.com/console', sort_order: 2 },
    { kode: 'cloudinary', field_key: 'api_secret', label: 'API Secret', tipe: 'secret', is_required: true, is_secret: true,  placeholder: 'abcdef123...',       deskripsi: 'API Secret — JANGAN expose ke browser', deep_link_url: 'https://cloudinary.com/console', sort_order: 3 },

    // ── XENDIT ────────────────────────────────────────────────────────────────
    { kode: 'xendit', field_key: 'mode',          label: 'Mode',                          tipe: 'select', is_required: true, is_secret: false, placeholder: null,                        deskripsi: 'Sandbox untuk testing, Production untuk transaksi nyata', deep_link_url: 'https://dashboard.xendit.co/settings/developers', nilai_default: 'sandbox', options: JSON.stringify([{value:'sandbox',label:'Sandbox (Testing)'},{value:'production',label:'Production (Live)'}]), sort_order: 1 },
    { kode: 'xendit', field_key: 'secret_key',    label: 'Secret Key',                    tipe: 'secret', is_required: true, is_secret: true,  placeholder: 'xnd_production_...',        deskripsi: 'Secret key — gunakan sesuai mode', deep_link_url: 'https://dashboard.xendit.co/settings/developers', prefix_sandbox: 'xnd_development_', prefix_production: 'xnd_production_', sort_order: 2 },
    { kode: 'xendit', field_key: 'public_key',    label: 'Public Key',                    tipe: 'text',   is_required: true, is_secret: false, placeholder: 'xnd_public_production_...',  deskripsi: 'Public key untuk client-side',    deep_link_url: 'https://dashboard.xendit.co/settings/developers', sort_order: 3 },
    { kode: 'xendit', field_key: 'webhook_token', label: 'Webhook Verification Token',    tipe: 'secret', is_required: true, is_secret: true,  placeholder: 'token-webhook-xxx',         deskripsi: 'Token verifikasi callback dari Xendit', deep_link_url: 'https://dashboard.xendit.co/settings/developers', sort_order: 4 },

    // ── FONNTE ────────────────────────────────────────────────────────────────
    { kode: 'fonnte', field_key: 'api_token',     label: 'API Token',             tipe: 'secret', is_required: true, is_secret: true,  placeholder: 'abcdef123456...', deskripsi: 'Token dari dashboard Fonnte — TANPA kata Bearer', deep_link_url: 'https://app.fonnte.com/profile', sort_order: 1 },
    { kode: 'fonnte', field_key: 'device_number', label: 'Nomor WhatsApp Device', tipe: 'text',   is_required: true, is_secret: false, placeholder: '6281234567890',   deskripsi: 'Nomor WA yang sudah di-scan di Fonnte — format 62xxx', deep_link_url: 'https://app.fonnte.com/device', sort_order: 2 },

    // ── SMTP ──────────────────────────────────────────────────────────────────
    { kode: 'smtp', field_key: 'host',       label: 'SMTP Host',      tipe: 'text',   is_required: true, is_secret: false, placeholder: 'smtp.gmail.com',    deskripsi: 'Alamat server SMTP',               deep_link_url: null, sort_order: 1 },
    { kode: 'smtp', field_key: 'port',       label: 'Port',           tipe: 'number', is_required: true, is_secret: false, placeholder: '587',               deskripsi: '587 untuk TLS, 465 untuk SSL',     deep_link_url: null, nilai_default: '587', sort_order: 2 },
    { kode: 'smtp', field_key: 'encryption', label: 'Enkripsi',       tipe: 'select', is_required: true, is_secret: false, placeholder: null,                deskripsi: 'Gunakan TLS untuk keamanan terbaik', deep_link_url: null, nilai_default: 'tls', options: JSON.stringify([{value:'tls',label:'TLS (Disarankan)'},{value:'ssl',label:'SSL'},{value:'none',label:'Tidak Ada Enkripsi'}]), sort_order: 3 },
    { kode: 'smtp', field_key: 'username',   label: 'Username',       tipe: 'email',  is_required: true, is_secret: false, placeholder: 'noreply@domain.com',deskripsi: 'Email pengirim',                   deep_link_url: null, sort_order: 4 },
    { kode: 'smtp', field_key: 'password',   label: 'Password',       tipe: 'secret', is_required: true, is_secret: true,  placeholder: null,                deskripsi: 'Password atau App Password email', deep_link_url: null, sort_order: 5 },
    { kode: 'smtp', field_key: 'from_name',  label: 'Nama Pengirim',  tipe: 'text',   is_required: true, is_secret: false, placeholder: 'ERP Mediator',      deskripsi: 'Nama yang tampil di kotak masuk penerima', deep_link_url: null, sort_order: 6 },
    { kode: 'smtp', field_key: 'from_email', label: 'Email Pengirim', tipe: 'email',  is_required: true, is_secret: false, placeholder: 'noreply@domain.com',deskripsi: 'Email yang tampil sebagai pengirim', deep_link_url: null, sort_order: 7 },

    // ── CLOUDFLARE ────────────────────────────────────────────────────────────
    { kode: 'cloudflare', field_key: 'zone_id',    label: 'Zone ID',    tipe: 'text',   is_required: true, is_secret: false, placeholder: 'abc123def456...', deskripsi: 'Zone ID domain di Cloudflare',        deep_link_url: 'https://dash.cloudflare.com', sort_order: 1 },
    { kode: 'cloudflare', field_key: 'api_token',  label: 'API Token',  tipe: 'secret', is_required: true, is_secret: true,  placeholder: 'xyz789...',        deskripsi: 'API Token dengan permission Zone:Edit', deep_link_url: 'https://dash.cloudflare.com/profile/api-tokens', sort_order: 2 },
    { kode: 'cloudflare', field_key: 'account_id', label: 'Account ID', tipe: 'text',   is_required: true, is_secret: false, placeholder: 'acc123...',        deskripsi: 'Account ID Cloudflare',                deep_link_url: 'https://dash.cloudflare.com', sort_order: 3 },
  ]

  const rows = fields.map(f => ({
    provider_id:       pid[f.kode],
    field_key:         f.field_key,
    label:             f.label,
    tipe:              f.tipe,
    is_required:       f.is_required,
    is_secret:         f.is_secret,
    options:           f.options ? JSON.parse(f.options) : null,
    placeholder:       f.placeholder || null,
    deskripsi:         f.deskripsi || null,
    deep_link_url:     f.deep_link_url || null,
    prefix_sandbox:    f.prefix_sandbox || null,
    prefix_production: f.prefix_production || null,
    nilai_default:     f.nilai_default || null,
    sort_order:        f.sort_order,
  }))

  const { error } = await db.from('provider_field_definitions').insert(rows)
  if (error) throw new Error(`seedProviderFieldDefinitions: ${error.message}`)
  console.log(`  ✅ Provider Field Definitions: ${rows.length} field (8 provider)`)
}

// ============================================================
// RUNNER UTAMA
// ============================================================

async function main() {
  console.log('🚀 Seeding database ERP Mediator...')
  console.log('─────────────────────────────────────────')

  console.log('\n[1/6] Tenant...')
  await seedTenant()

  console.log('\n[2/6] Platform Policies...')
  await seedPolicies()

  console.log('\n[3/6] Config Registry...')
  await seedConfigRegistry()

  console.log('\n[4/6] Message Library...')
  await seedMessageLibrary()

  console.log('\n[5/6] Service Providers (Katalog API)...')
  await seedServiceProviders()

  console.log('\n[6/6] Provider Field Definitions...')
  await seedProviderFieldDefinitions()

  console.log('\n─────────────────────────────────────────')
  console.log('🎉 SELESAI! Semua data berhasil di-seed.')
  console.log('Tenant ID:', TENANT_ID)
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
