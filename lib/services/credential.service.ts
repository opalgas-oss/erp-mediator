// lib/services/credential.service.ts
// Service layer untuk credential management.
// Enkripsi/dekripsi dilakukan di sini (bukan di repository atau route).
// Dibuat: Sesi #052 — BLOK C-02 TODO_ARSITEKTUR_LAYER_v1
// Update: Sesi #107 — M3 Credential Management (+5 fungsi UI dashboard)

import 'server-only'
import { unstable_cache } from 'next/cache'
import {
  spGetCredential,
  getAllByProvider,
  getProvidersWithStatus,
  getInstancesByProvider,
  getFieldDefinitions,
  getCredentialFingerprints,
  insertInstance,
  upsertCredential,
  spTestProviderConnection,
  type CredentialResult,
} from '@/lib/repositories/credential.repository'
import { enkripsiCredential, dekripsi, fingerprint } from '@/lib/credential-crypto'
import type {
  ServiceProvider,
  ProviderInstance,
  ProviderFieldDef,
  InstanceCredential,
  TambahInstancePayload,
  SimpanCredentialPayload,
  TestKoneksiResult,
  HealthStatus,
} from '@/lib/types/provider.types'

// ─── ENV_FALLBACK (existing) ─────────────────────────────────────────────────

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
  fieldKey: string
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
  fieldKey: string
): Promise<string | null> {
  try {
    const cached = unstable_cache(
      async () => {
        const result: CredentialResult = await spGetCredential({ providerKode, fieldKey })
        if (result.status !== 'FOUND' || !result.encrypted_value) return null
        if (result.is_secret) return dekripsi(result.encrypted_value)
        return result.encrypted_value
      },
      [`credential:${providerKode}:${fieldKey}`],
      { revalidate: 15 * 60, tags: ['credentials', `credential:${providerKode}`] }
    )
    return await cached()
  } catch {
    return null
  }
}

/**
 * Ambil semua credential fields untuk satu provider — cache + env fallback.
 */
export async function getCredentialsByProvider(
  providerKode: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const envFields = ENV_FALLBACK[providerKode] ?? {}

  try {
    const cached = unstable_cache(
      async () => {
        const creds = await getAllByProvider(providerKode)
        const map: Record<string, string> = {}
        for (const c of creds) {
          try {
            map[c.field_key] = c.is_secret ? dekripsi(c.encrypted_value) : c.encrypted_value
          } catch { /* skip field gagal didekripsi */ }
        }
        return map
      },
      [`credentials:provider:${providerKode}`],
      { revalidate: 15 * 60, tags: ['credentials', `credential:${providerKode}`] }
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
 * Dipakai untuk render form dialog Isi Credential secara dinamis.
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
  userId: string
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
  userId: string
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
 * Test koneksi ke provider eksternal.
 * HTTP ping dilakukan di sini (service layer).
 * Hasil disimpan ke DB via sp_test_provider_connection.
 *
 * Saat ini: simulasi ping via fetch ke status_url provider.
 * Nanti: bisa diganti dengan ping spesifik per provider (Xendit, Fonnte, dll).
 */
export async function testKoneksi(
  instanceId: string,
  statusUrl: string | null
): Promise<TestKoneksiResult> {
  const start = Date.now()

  try {
    if (!statusUrl) {
      // Tidak ada status URL — tandai belum dites, bukan gagal
      await spTestProviderConnection({
        instanceId,
        healthStatus: 'belum_dites',
      })
      return { berhasil: false, health_status: 'belum_dites', pesan: 'URL status tidak tersedia', latency_ms: null }
    }

    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 8000) // 8 detik timeout

    const res = await fetch(statusUrl, {
      method: 'GET',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    const latency_ms   = Date.now() - start
    const healthStatus: HealthStatus = res.ok ? 'sehat' : 'peringatan'

    await spTestProviderConnection({
      instanceId,
      healthStatus,
      errorMessage: res.ok ? undefined : `HTTP ${res.status}`,
    })

    return {
      berhasil:      res.ok,
      health_status: healthStatus,
      pesan:         res.ok ? null : `HTTP ${res.status} ${res.statusText}`,
      latency_ms,
    }
  } catch (err) {
    const latency_ms = Date.now() - start
    const pesan      = err instanceof Error ? err.message : 'Koneksi gagal'

    await spTestProviderConnection({
      instanceId,
      healthStatus: 'gagal',
      errorMessage: pesan,
    })

    return { berhasil: false, health_status: 'gagal', pesan, latency_ms }
  }
}

// ─── Re-export untuk caller yang butuh fungsi crypto ─────────────────────────
export { enkripsiCredential, dekripsi, fingerprint }
