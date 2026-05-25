// lib/services/credential.service.ts
// Service layer untuk credential management.
// Enkripsi/dekripsi dilakukan di sini (bukan di repository atau route).
// Dibuat: Sesi #052 — BLOK C-02 TODO_ARSITEKTUR_LAYER_v1
// Update: Sesi #107 — M3 Credential Management (+5 fungsi UI dashboard)
// Update: Sesi #109 — M3 Step 5.2b: testKoneksi() → authenticated test via provider-tester.ts
// Update: Sesi #216 — FIX: bypass cache + dekripsiCredential di testKoneksi + getCredentialPlaintext untuk UI Kelola
// Update: Sesi #217 — fix getCredentialsByProvider: dekripsiCredential jika DEK ada, fallback dekripsi jika tidak

import 'server-only'
import { unstable_cache } from 'next/cache'
import { getConfigValue, parseConfigNumber } from '@/lib/config-registry'
import {
  spGetCredential,
  getAllByProvider,
  getCredentialsByInstanceId,
  getProvidersWithStatus,
  getInstancesByProvider,
  getFieldDefinitions,
  getCredentialFingerprints,
  insertInstance,
  upsertCredential,
  spTestProviderConnection,
  getProviderByInstanceId,
  insertProvider,
  insertFieldDef,
  type CredentialResult,
} from '@/lib/repositories/credential.repository'
import { enkripsiCredential, dekripsi, dekripsiCredential, fingerprint } from '@/lib/credential-crypto'
import { testProvider }                               from '@/lib/services/provider-tester'
import type {
  ServiceProvider,
  ProviderInstance,
  ProviderFieldDef,
  InstanceCredential,
  TambahInstancePayload,
  TambahProviderPayload,
  SimpanCredentialPayload,
  TestKoneksiResult,
} from '@/lib/types/provider.types'

// ─── ENV_FALLBACK ─────────────────────────────────────────────────────────────
// Fallback ke .env jika credential belum ada di DB.
// Target jangka panjang: semua provider pindah ke DB (eliminasi .env provider keys).

const ENV_FALLBACK: Record<string, Record<string, string>> = {
  supabase: {
    project_url:      'NEXT_PUBLIC_SUPABASE_URL',
    anon_key:         'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    service_role_key: 'SUPABASE_SERVICE_ROLE_KEY',
    jwt_secret:       'SUPABASE_JWT_SECRET',
  },
  upstash: {
    rest_url:   'UPSTASH_REDIS_REST_URL',
    rest_token: 'UPSTASH_REDIS_REST_TOKEN',
  },
  fonnte: {
    api_token:     'FONNTE_API_KEY',
    device_number: 'FONNTE_DEVICE_NUMBER',
  },
  xendit: {
    secret_key:    'XENDIT_SECRET_KEY',
    webhook_token: 'XENDIT_WEBHOOK_TOKEN',
  },
  cloudinary: {
    cloud_name: 'CLOUDINARY_CLOUD_NAME',
    api_key:    'CLOUDINARY_API_KEY',
    api_secret: 'CLOUDINARY_API_SECRET',
  },
  smtp: {
    host:       'SMTP_HOST',
    port:       'SMTP_PORT',
    username:   'SMTP_USERNAME',
    password:   'SMTP_PASSWORD',
    from_name:  'SMTP_FROM_NAME',
    from_email: 'SMTP_FROM_EMAIL',
  },
}

// ─── Service (existing) ──────────────────────────────────────────────────────

/**
 * Ambil satu credential field — dari DB via SP + cache 15 menit, atau env fallback.
 */
export async function getCredential(
  providerKode: string,
  fieldKey:     string
): Promise<string | null> {
  const fromDB = await getCredentialFromDB(providerKode, fieldKey)
  if (fromDB !== null) return fromDB

  const envKey = ENV_FALLBACK[providerKode]?.[fieldKey]
  if (envKey) {
    const envVal = process.env[envKey] ?? null
    if (envVal) return envVal
  }

  return null
}

async function getCredentialFromDB(
  providerKode: string,
  fieldKey:     string
): Promise<string | null> {
  try {
    const ttlStr = await getConfigValue('platform_general', 'redis_ttl_credentials_seconds', '900')
    const ttl    = parseConfigNumber(ttlStr, 900)
    const cached = unstable_cache(
      async () => {
        const result: CredentialResult = await spGetCredential({ providerKode, fieldKey })
        if (result.status !== 'FOUND' || !result.encrypted_value) return null
        if (result.is_secret) return dekripsi(result.encrypted_value)
        return result.encrypted_value
      },
      [`credential:${providerKode}:${fieldKey}`],
      { revalidate: ttl, tags: ['credentials', `credential:${providerKode}`] }
    )
    return await cached()
  } catch {
    return null
  }
}

/**
 * Ambil semua credential fields untuk satu provider — cache + env fallback.
 * Mengembalikan map field_key → nilai plaintext (sudah didekripsi).
 */
export async function getCredentialsByProvider(
  providerKode: string
): Promise<Record<string, string>> {
  const result:    Record<string, string> = {}
  const envFields: Record<string, string> = ENV_FALLBACK[providerKode] ?? {}

  try {
    const ttlStr = await getConfigValue('platform_general', 'redis_ttl_credentials_seconds', '900')
    const ttl    = parseConfigNumber(ttlStr, 900)
    const cached = unstable_cache(
      async () => {
        const creds = await getAllByProvider(providerKode)
        const map:  Record<string, string> = {}
        for (const c of creds) {
          try {
            if (c.encrypted_dek) {
              // Envelope encryption (format S#107+) — semua fields simpanCredential pakai enkripsiCredential
              map[c.field_key] = dekripsiCredential(c.encrypted_dek, c.encrypted_value)
            } else if (c.is_secret) {
              // Simple encryption (format lama, data sebelum S#107) — fallback backward-compat
              map[c.field_key] = dekripsi(c.encrypted_value)
            } else {
              // Non-secret tanpa DEK (data lama, tidak terenkripsi) — simpan as-is
              map[c.field_key] = c.encrypted_value
            }
          } catch { /* skip field gagal didekripsi */ }
        }
        return map
      },
      [`credentials:provider:${providerKode}`],
      { revalidate: ttl, tags: ['credentials', `credential:${providerKode}`] }
    )
    const fromDB = await cached()
    Object.assign(result, fromDB)
  } catch { /* fallback ke env */ }

  for (const [fieldKey, envKey] of Object.entries(envFields)) {
    if (!result[fieldKey]) {
      const val = process.env[envKey]
      if (val) result[fieldKey] = val
    }
  }

  return result
}

// ─── Service (M3 — UI Dashboard) — Sesi #107 ─────────────────────────────────

/**
 * List semua provider aktif beserta health_overall.
 * Dipakai di panel kiri halaman /providers.
 */
export async function listProviders(): Promise<ServiceProvider[]> {
  return getProvidersWithStatus()
}

/**
 * List semua instance untuk satu provider.
 * Dipakai di panel kanan halaman /providers saat provider dipilih.
 */
export async function listInstances(providerId: string): Promise<ProviderInstance[]> {
  return getInstancesByProvider(providerId)
}

/**
 * Ambil field definitions untuk satu provider.
 * Dipakai untuk render form dialog Konfigurasi Koneksi secara dinamis.
 */
export async function listFieldDefs(providerId: string): Promise<ProviderFieldDef[]> {
  return getFieldDefinitions(providerId)
}

/**
 * Ambil fingerprint credential per instance — untuk tampil di UI.
 * Nilai asli TIDAK di-expose — hanya 4 karakter terakhir.
 */
export async function listCredentialFingerprints(instanceId: string): Promise<InstanceCredential[]> {
  return getCredentialFingerprints(instanceId)
}

/**
 * Tambah instance baru untuk satu provider.
 */
export async function tambahInstance(
  payload: TambahInstancePayload,
  userId:  string
): Promise<ProviderInstance> {
  return insertInstance({
    provider_id: payload.provider_id,
    nama_server: payload.nama_server,
    deskripsi:   payload.deskripsi,
    is_default:  payload.is_default,
    created_by:  userId,
  })
}

/**
 * Enkripsi dan simpan credential fields untuk satu instance.
 * Envelope encryption: setiap field punya DEK unik, DEK dienkripsi Master Key.
 * Enkripsi dilakukan di sini (service layer) — TIDAK di repository atau route.
 */
export async function simpanCredential(
  payload: SimpanCredentialPayload,
  userId:  string
): Promise<void> {
  for (const field of payload.fields) {
    if (!field.nilai || field.nilai.trim() === '') continue

    const { encrypted_dek, encrypted_value, fingerprint: fp } =
      enkripsiCredential(field.nilai)

    await upsertCredential({
      instance_id:     payload.instance_id,
      field_def_id:    field.field_def_id,
      encrypted_dek,
      encrypted_value,
      fingerprint:     fp,
      updated_by:      userId,
    })
  }
}

/**
 * Ambil credential plaintext untuk satu instance — dipakai UI "Kelola" untuk pre-fill form.
 * Mengembalikan DUA map: byFieldDefId (untuk isi cred state dialog) + byFieldKey (untuk referensi).
 * SA only — tidak boleh dipakai di context browser langsung tanpa auth gate di route.
 */
export async function getCredentialPlaintext(instanceId: string): Promise<{
  byFieldDefId: Record<string, string>
  byFieldKey:   Record<string, string>
}> {
  const rows = await getCredentialsByInstanceId(instanceId)
  const byFieldDefId: Record<string, string> = {}
  const byFieldKey:   Record<string, string>   = {}

  for (const row of rows) {
    try {
      const val = dekripsiCredential(row.encrypted_dek, row.encrypted_value)
      byFieldDefId[row.field_def_id] = val
      byFieldKey[row.field_key]      = val
    } catch { /* skip field yang gagal didekripsi */ }
  }

  return { byFieldDefId, byFieldKey }
}

/**
 * Authenticated test koneksi ke provider eksternal.
 * Alur: cari provider kode dari instanceId → ambil credentials → call provider-tester → simpan hasil.
 * Signature baru S#109: tidak lagi butuh statusUrl — semua dilakukan internal.
 *
 * Health status mapping:
 *   sehat      = server reachable + terautentikasi
 *   peringatan = server reachable + auth gagal
 *   gagal      = server tidak bisa dijangkau
 */
export async function testKoneksi(instanceId: string): Promise<TestKoneksiResult> {
  // 1. Cari provider kode dari instance ini
  const providerInfo = await getProviderByInstanceId(instanceId)

  if (!providerInfo) {
    await spTestProviderConnection({
      instanceId,
      healthStatus:    'gagal',
      errorMessage:    'Instance atau provider tidak ditemukan di database',
      isAuthenticated: null,
    })
    return {
      berhasil:         false,
      is_authenticated: null,
      health_status:    'gagal',
      pesan:            'Instance atau provider tidak ditemukan',
      latency_ms:       0,
    }
  }

  // 2. Ambil credentials FRESH dari DB dengan dekripsiCredential (envelope encryption).
  //    S#216 FIX: simpanCredential pakai enkripsiCredential (DEK per field),
  //    tapi getAllByProvider pakai dekripsi (simple, Master Key langsung) — MISMATCH.
  //    Solusi: query langsung dengan encrypted_dek via getCredentialsByInstanceId,
  //    kemudian pakai dekripsiCredential(encrypted_dek, encrypted_value) yang benar.
  const credRows = await getCredentialsByInstanceId(instanceId)
  const credentials: Record<string, string> = {}
  for (const c of credRows) {
    try {
      credentials[c.field_key] = dekripsiCredential(c.encrypted_dek, c.encrypted_value)
    } catch { /* skip field yang gagal didekripsi */ }
  }
  // Env fallback: jika DB kosong, coba ambil dari .env (untuk provider lama yang belum migrasi ke DB)
  const envFields = ENV_FALLBACK[providerInfo.kode] ?? {}
  for (const [fieldKey, envKey] of Object.entries(envFields)) {
    if (!credentials[fieldKey]) {
      const val = process.env[envKey]
      if (val) credentials[fieldKey] = val
    }
  }

  // 3. Jalankan authenticated test via provider-tester.ts
  const result = await testProvider(providerInfo.kode, credentials)

  // 4. Simpan hasil ke DB
  await spTestProviderConnection({
    instanceId,
    healthStatus:    result.health_status,
    errorMessage:    result.pesan ?? undefined,
    isAuthenticated: result.is_authenticated,
    authError:       result.is_authenticated === false ? (result.pesan ?? undefined) : undefined,
  })

  return result
}

// ─── Re-export untuk caller yang butuh fungsi crypto ─────────────────────────
/**
 * Tambah provider baru ke Supabase + field definitions-nya.
 * Auto-generate kode dari nama: lowercase, non-alphanumeric diganti underscore.
 * Validasi unik kode via UNIQUE constraint Supabase.
 * S#218 - fitur Tambah Provider dashboard SA.
 */
export async function tambahProvider(
  payload: TambahProviderPayload,
  userId:  string
): Promise<ServiceProvider> {
  const kode = payload.nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

  const provider = await insertProvider({
    kode,
    nama:      payload.nama,
    kategori:  payload.kategori,
    tag:       payload.tag,
    deskripsi: payload.deskripsi,
    docs_url:  payload.docs_url,
  })

  for (const fd of payload.field_defs) {
    await insertFieldDef({
      provider_id: provider.id,
      field_key:   fd.field_key,
      label:       fd.label,
      tipe:        fd.tipe,
      is_required: fd.is_required,
      is_secret:   fd.is_secret,
      placeholder: fd.placeholder,
      deskripsi:   fd.deskripsi,
      sort_order:  fd.sort_order,
    })
  }

  void userId
  return provider
}

export { enkripsiCredential, dekripsi, fingerprint }
