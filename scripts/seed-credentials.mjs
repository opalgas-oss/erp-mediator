// scripts/seed-credentials.mjs
// Migrasi credential dari .env ke database terenkripsi AES-256-GCM.
// Jalankan SETELAH seed-tenant.mjs berhasil.
//
// Yang dilakukan script ini:
//   1. Generate MASTER_ENCRYPTION_KEY jika belum ada di .env → tulis otomatis ke .env
//   2. Baca semua credential dari .env
//   3. Enkripsi tiap credential
//   4. Buat provider_instances (satu default instance per provider yang ada credential-nya)
//   5. Simpan instance_credentials ke database
//
// Jalankan: node scripts/seed-credentials.mjs

import { createClient }  from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { createCipheriv, randomBytes } from 'crypto'

// ─── Baca .env ────────────────────────────────────────────────────────────────
const __dirname  = dirname(fileURLToPath(import.meta.url))
const envPath    = join(__dirname, '..', '.env.development.local')
let   envContent = readFileSync(envPath, 'utf-8')

function readEnv(content) {
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  }
  return env
}

let env = readEnv(envContent)

// ─── Auto-generate MASTER_ENCRYPTION_KEY jika belum ada ───────────────────────
if (!env['MASTER_ENCRYPTION_KEY']) {
  const newKey = randomBytes(32).toString('hex')
  console.log('\n🔑 MASTER_ENCRYPTION_KEY belum ada — generate baru...')
  envContent += `\n# Master Encryption Key (AES-256-GCM) — JANGAN hapus atau ubah\nMASTER_ENCRYPTION_KEY=${newKey}\n`
  writeFileSync(envPath, envContent, 'utf-8')
  env = readEnv(envContent)
  console.log(`   ✅ MASTER_ENCRYPTION_KEY berhasil digenerate dan disimpan ke .env`)
  console.log(`   ⚠️  PENTING: Tambahkan key ini ke Vercel env vars sebelum deploy!\n`)
} else {
  console.log('\n🔑 MASTER_ENCRYPTION_KEY sudah ada — menggunakan key yang ada.\n')
}

const MASTER_KEY     = Buffer.from(env['MASTER_ENCRYPTION_KEY'], 'hex')
const ALGORITHM      = 'aes-256-gcm'
const IV_LENGTH      = 12
const TAG_LENGTH     = 16

const SUPABASE_URL   = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY    = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE URL atau SERVICE_ROLE_KEY tidak ditemukan di .env')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Helper enkripsi (versi JS — sama logika dengan lib/credential-crypto.ts) ──
function enkripsi(plaintext) {
  const iv      = randomBytes(IV_LENGTH)
  const cipher  = createCipheriv(ALGORITHM, MASTER_KEY, iv)
  const enc     = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, enc]).toString('base64')
}

function fingerprint(value) {
  if (!value || value.length <= 4) return '****'
  return `...${value.slice(-4)}`
}

// ─── Definisi credential yang akan dimigrasikan ───────────────────────────────
// Setiap entry: { providerKode, namaServer, fieldKey, envKey, isSecret }
// envKey = nama env var yang dibaca nilainya

const CREDENTIAL_MAP = [
  // SUPABASE
  { providerKode: 'supabase', namaServer: 'Supabase Dev', fieldKey: 'project_url',      envKey: 'NEXT_PUBLIC_SUPABASE_URL',        isSecret: false },
  { providerKode: 'supabase', namaServer: 'Supabase Dev', fieldKey: 'anon_key',          envKey: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',   isSecret: false },
  { providerKode: 'supabase', namaServer: 'Supabase Dev', fieldKey: 'service_role_key',  envKey: 'SUPABASE_SERVICE_ROLE_KEY',       isSecret: true  },
  { providerKode: 'supabase', namaServer: 'Supabase Dev', fieldKey: 'jwt_secret',        envKey: 'SUPABASE_JWT_SECRET',             isSecret: true  },

  // UPSTASH REDIS
  { providerKode: 'upstash', namaServer: 'Upstash Redis', fieldKey: 'rest_url',          envKey: 'UPSTASH_REDIS_REST_URL',          isSecret: false },
  { providerKode: 'upstash', namaServer: 'Upstash Redis', fieldKey: 'rest_token',        envKey: 'UPSTASH_REDIS_REST_TOKEN',        isSecret: true  },

  // FONNTE
  { providerKode: 'fonnte', namaServer: 'Fonnte WhatsApp', fieldKey: 'api_token',        envKey: 'FONNTE_API_KEY',                  isSecret: true  },

  // XENDIT
  { providerKode: 'xendit', namaServer: 'Xendit', fieldKey: 'secret_key',               envKey: 'XENDIT_SECRET_KEY',               isSecret: true  },
]

// ─── RUNNER UTAMA ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Migrasi credential dari .env ke database...\n')

  // Kelompokkan credential per provider
  const perProvider = {}
  for (const c of CREDENTIAL_MAP) {
    if (!perProvider[c.providerKode]) perProvider[c.providerKode] = []
    perProvider[c.providerKode].push(c)
  }

  for (const [providerKode, creds] of Object.entries(perProvider)) {
    const namaServer = creds[0].namaServer

    // Cek apakah minimal satu credential punya nilai di .env
    const adaNilai = creds.some(c => env[c.envKey])
    if (!adaNilai) {
      console.log(`⏭️  Skip ${namaServer} — tidak ada nilai di .env`)
      continue
    }

    // Ambil provider_id
    const { data: provider, error: pErr } = await db
      .from('service_providers').select('id').eq('kode', providerKode).single()
    if (pErr || !provider) {
      console.error(`❌ Provider '${providerKode}' tidak ditemukan — jalankan seed-tenant.mjs dulu`)
      continue
    }

    // Hapus instance lama jika ada, buat baru
    await db.from('provider_instances')
      .delete().eq('provider_id', provider.id)

    const { data: instance, error: iErr } = await db
      .from('provider_instances')
      .insert({
        provider_id:   provider.id,
        nama_server:   namaServer,
        is_aktif:      true,
        is_default:    true,
        health_status: 'belum_dites',
        created_at:    new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      })
      .select('id')
      .single()

    if (iErr || !instance) {
      console.error(`❌ Gagal buat instance ${namaServer}: ${iErr?.message}`)
      continue
    }

    console.log(`📦 ${namaServer}:`)
    let berhasil = 0

    for (const c of creds) {
      const nilai = env[c.envKey]
      if (!nilai) {
        console.log(`   ⏭️  ${c.fieldKey} — tidak ada di .env, skip`)
        continue
      }

      // Ambil field_def_id
      const { data: fieldDef } = await db
        .from('provider_field_definitions')
        .select('id').eq('provider_id', provider.id).eq('field_key', c.fieldKey).single()

      if (!fieldDef) {
        console.log(`   ⚠️  ${c.fieldKey} — field definition tidak ditemukan`)
        continue
      }

      // Enkripsi jika secret, plain jika tidak
      const storedValue = c.isSecret ? enkripsi(nilai) : nilai
      const fp          = c.isSecret ? fingerprint(nilai) : null

      const { error: credErr } = await db
        .from('instance_credentials')
        .upsert({
          instance_id:     instance.id,
          field_def_id:    fieldDef.id,
          encrypted_value: storedValue,
          fingerprint:     fp,
          key_version:     1,
          updated_at:      new Date().toISOString(),
        }, { onConflict: 'instance_id,field_def_id' })

      if (credErr) {
        console.log(`   ❌ ${c.fieldKey} — gagal: ${credErr.message}`)
      } else {
        const display = c.isSecret ? `••••${nilai.slice(-4)}` : nilai
        console.log(`   ✅ ${c.fieldKey} = ${display}`)
        berhasil++
      }
    }

    console.log(`   → ${berhasil}/${creds.length} field berhasil disimpan\n`)
  }

  console.log('─────────────────────────────────────────')
  console.log('🎉 Migrasi credential selesai!')
  console.log('')
  console.log('⚠️  Langkah selanjutnya:')
  console.log('   1. Salin MASTER_ENCRYPTION_KEY dari .env ke Vercel env vars')
  console.log('   2. Pastikan key ini TIDAK masuk ke Git (.gitignore sudah mengecualikan .env)')
  console.log('')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
