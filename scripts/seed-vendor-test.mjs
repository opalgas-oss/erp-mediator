// scripts/seed-vendor-test.mjs
// Script seed untuk akun Vendor test — TC-D01, D02, D03
// Jalankan: node scripts/seed-vendor-test.mjs
//
// Yang di-seed:
//   1. vendor.pending@test.com  → status PENDING  (TC-D01: diblokir "belum diaktifkan")
//   2. vendor.review@test.com   → status REVIEW   (TC-D02: diblokir "belum diaktifkan")
//   3. vendor.approved@test.com → status APPROVED (TC-D03: masuk /dashboard/vendor)
//
// Password semua akun : Vendor123!
// Role                : VENDOR (app_metadata.app_role + user_profiles.role)
// Tenant              : aaaaaaaa-0000-0000-0000-000000000001
//
// ⚠️  PRASYARAT SEBELUM JALANKAN SCRIPT INI:
//   1. Buka Supabase Dashboard → Table Editor → config_registry
//   2. Cari baris: feature_key = 'test_config', policy_key = 'vendor_approved_nomor_wa'
//   3. Isi kolom 'nilai' dengan nomor WA Anda (format: 628xxx)
//   4. Simpan → baru jalankan: node scripts/seed-vendor-test.mjs

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join }  from 'path'
import { readFileSync }   from 'fs'

// ─── Baca .env ─────────────────────────────────────────────────────────────
const __dirname  = dirname(fileURLToPath(import.meta.url))
const envPath    = join(__dirname, '..', '.env.development.local')
const envContent = readFileSync(envPath, 'utf-8')

const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Konstanta ─────────────────────────────────────────────────────────────
// Hanya nilai yang tidak berubah antar deploy dan bukan data bisnis yang boleh di sini.
// Semua nilai konfigurasi WAJIB dibaca dari config_registry.
const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const PASSWORD  = 'Vendor123!'

// ─── Baca config test dari config_registry ─────────────────────────────────
// Semua nilai yang bisa berubah (nomor WA, dll) dibaca dari DB, bukan hardcode.
async function bacaConfigTest() {
  const { data, error } = await db
    .from('config_registry')
    .select('policy_key, nilai')
    .eq('feature_key', 'test_config')
    .is('tenant_id', null)

  if (error) throw new Error(`Gagal baca config_registry test_config: ${error.message}`)

  const cfg = {}
  for (const row of data ?? []) {
    cfg[row.policy_key] = row.nilai
  }
  return cfg
}

// ─── Fungsi: buat atau perbarui satu akun vendor ───────────────────────────
async function seedSatuVendor(akun) {
  console.log(`\n  [${akun.tc}] ${akun.email} — status: ${akun.status}`)

  // ── Langkah 1: Buat auth user (atau perbarui jika sudah ada) ──────────────
  let authUserId = null

  const { data: createData, error: createError } = await db.auth.admin.createUser({
    email:         akun.email,
    password:      PASSWORD,
    email_confirm: true,
    app_metadata: {
      app_role:  'VENDOR',
      tenant_id: TENANT_ID,
    },
    user_metadata: {
      nama: akun.nama,
    },
  })

  if (createError) {
    // Kalau sudah ada → cari ID-nya lalu update
    const pesanError = createError.message?.toLowerCase() ?? ''
    if (
      pesanError.includes('already') ||
      pesanError.includes('duplicate') ||
      pesanError.includes('exists')
    ) {
      console.log(`     ℹ️  Auth user sudah ada — mencari ID dan memperbarui...`)

      const { data: listData, error: listError } = await db.auth.admin.listUsers()
      if (listError) throw new Error(`Gagal list users: ${listError.message}`)

      const existing = listData?.users?.find(u => u.email === akun.email)
      if (!existing) throw new Error(`User ${akun.email} tidak ditemukan setelah error duplicate`)

      authUserId = existing.id

      const { error: updateError } = await db.auth.admin.updateUserById(authUserId, {
        password:     PASSWORD,
        app_metadata: { app_role: 'VENDOR', tenant_id: TENANT_ID },
      })
      if (updateError) throw new Error(`Gagal update auth user: ${updateError.message}`)
      console.log(`     ✅ Auth user diperbarui — ID: ${authUserId}`)

    } else {
      throw new Error(`Gagal buat auth user ${akun.email}: ${createError.message}`)
    }
  } else {
    authUserId = createData.user.id
    console.log(`     ✅ Auth user dibuat — ID: ${authUserId}`)
  }

  // ── Langkah 2: Upsert user_profiles ──────────────────────────────────────
  // nomor_wa: untuk PENDING/REVIEW kosong (diblokir sebelum OTP)
  //           untuk APPROVED diisi dari config_registry.test_config.vendor_approved_nomor_wa
  const { error: profileError } = await db
    .from('user_profiles')
    .upsert(
      {
        id:         authUserId,
        tenant_id:  TENANT_ID,
        email:      akun.email,
        nama:       akun.nama,
        role:       'VENDOR',
        nomor_wa:   akun.nomor_wa || null,
        status:     akun.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    throw new Error(`Gagal upsert user_profiles ${akun.email}: ${profileError.message}`)
  }

  const tampilWA = akun.nomor_wa ? akun.nomor_wa : '(kosong — tidak diperlukan untuk TC ini)'
  console.log(`     ✅ user_profiles → status: ${akun.status}, nomor_wa: ${tampilWA}`)

  return authUserId
}

// ─── Runner utama ───────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Seed akun Vendor test — TC-D01 / D02 / D03')
  console.log('─────────────────────────────────────────────')

  // Baca config dari DB — bukan dari hardcode
  console.log('\n📋 Membaca config dari config_registry...')
  const cfg = await bacaConfigTest()

  const nomorWAApproved = cfg['vendor_approved_nomor_wa'] || ''

  // Validasi: nomor WA untuk akun APPROVED wajib diisi sebelum jalankan script
  if (!nomorWAApproved) {
    console.error('\n❌ STOP: vendor_approved_nomor_wa belum diisi di config_registry.')
    console.error('   Langkah:')
    console.error('   1. Buka Supabase Dashboard → Table Editor → config_registry')
    console.error('   2. Cari: feature_key = "test_config", policy_key = "vendor_approved_nomor_wa"')
    console.error('   3. Isi kolom "nilai" dengan nomor WA Anda (contoh: 6281234567890)')
    console.error('   4. Simpan → ulangi: node scripts/seed-vendor-test.mjs')
    process.exit(1)
  }

  console.log(`   ✅ vendor_approved_nomor_wa : ${nomorWAApproved}`)

  // Daftar 3 akun vendor test
  // nomor_wa PENDING/REVIEW dikosongkan — diblokir sebelum OTP, nomor tidak dipakai
  // nomor_wa APPROVED dibaca dari config_registry — dipakai untuk kirim OTP TC-D03
  const VENDOR_ACCOUNTS = [
    {
      email:    'vendor.pending@test.com',
      nama:     'Vendor Pending Test',
      status:   'PENDING',
      nomor_wa: '',
      tc:       'TC-D01',
    },
    {
      email:    'vendor.review@test.com',
      nama:     'Vendor Review Test',
      status:   'REVIEW',
      nomor_wa: '',
      tc:       'TC-D02',
    },
    {
      email:    'vendor.approved@test.com',
      nama:     'Vendor Approved Test',
      status:   'APPROVED',
      nomor_wa: nomorWAApproved,   // dari config_registry — bukan hardcode
      tc:       'TC-D03',
    },
  ]

  console.log(`\n   Tenant ID : ${TENANT_ID}`)
  console.log(`   Akun      : ${VENDOR_ACCOUNTS.length} vendor`)

  const hasil = []
  for (const akun of VENDOR_ACCOUNTS) {
    const userId = await seedSatuVendor(akun)
    hasil.push({ ...akun, userId })
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('✅ SELESAI — Ringkasan akun yang dibuat:\n')

  for (const h of hasil) {
    console.log(`  [${h.tc}] ${h.email}`)
    console.log(`         Status   : ${h.status}`)
    console.log(`         User ID  : ${h.userId}`)
    if (h.nomor_wa) {
      console.log(`         Nomor WA : ${h.nomor_wa}`)
    }
    console.log('')
  }

  console.log('Langkah berikutnya:')
  console.log('  Buka staging URL di browser:')
  console.log('  https://erp-mediator-git-dev-philips-liemenas-projects.vercel.app/login')
  console.log('')
  console.log('  TC-D01: Login vendor.pending@test.com  → harus muncul "belum diaktifkan"')
  console.log('  TC-D02: Login vendor.review@test.com   → harus muncul "belum diaktifkan"')
  console.log('  TC-D03: Login vendor.approved@test.com → harus masuk /dashboard/vendor')
  console.log('')

  process.exit(0)
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
