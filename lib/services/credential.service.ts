// lib/services/credential.service.ts
// Service layer untuk credential management — gabung credential-reader + credential-crypto.
// Panggil repository untuk DB, dekripsi di sini (app layer).
// Dibuat: Sesi #052 — BLOK C-02 TODO_ARSITEKTUR_LAYER_v1
//
// ARSITEKTUR:
//   Route Handler → CredentialService → CredentialRepository → SP/DB
//   Enkripsi/dekripsi dilakukan di service (bukan repository) — security boundary.
//   Cache via unstable_cache (15 menit) — sama seperti credential-reader.ts existing.

import 'server-only'
import { unstable_cache } from 'next/cache'
import {
  spGetCredential,
  getAllByProvider,
  type CredentialResult,
} from '@/lib/repositories/credential.repository'
import { enkripsi, dekripsi, fingerprint } from '@/lib/credential-crypto'

// ─── ENV_FALLBACK — dipindahkan dari credential-reader.ts ────────────────────
// Jika credential belum ada di DB, fallback ke env var
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

// ─── FUNGSI: getCredential ───────────────────────────────────────────────────
// Ambil satu credential field — dari DB (via SP + cache) atau env fallback.
// Return plaintext (sudah didekripsi jika is_secret).
/**
 * Ambil satu credential field — dari DB via SP + cache 15 menit, atau env fallback.
 * Return plaintext (sudah didekripsi jika is_secret = true).
 * @param providerKode - Kode provider (misal: 'fonnte', 'xendit')
 * @param fieldKey - Nama field (misal: 'api_token', 'secret_key')
 * @returns Nilai credential sebagai string, null jika tidak ditemukan
 */
export async function getCredential(
  providerKode: string,
  fieldKey: string
): Promise<string | null> {
  // Coba dari DB dulu (dengan cache 15 menit)
  const fromDB = await getCredentialFromDB(providerKode, fieldKey)
  if (fromDB !== null) return fromDB

  // Fallback ke env var
  const envKey = ENV_FALLBACK[providerKode]?.[fieldKey]
  if (envKey) {
    const envVal = process.env[envKey] ?? null
    if (envVal) return envVal
  }

  return null
}

// ─── PRIVATE: baca credential dari DB via SP dengan cache ────────────────────
async function getCredentialFromDB(
  providerKode: string,
  fieldKey: string
): Promise<string | null> {
  try {
    const cached = unstable_cache(
      async () => {
        const result: CredentialResult = await spGetCredential({
          providerKode,
          fieldKey,
        })
        if (result.status !== 'FOUND' || !result.encrypted_value) return null

        // Dekripsi di app layer — bukan di DB
        if (result.is_secret) {
          return dekripsi(result.encrypted_value)
        }
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

// ─── FUNGSI: getCredentialsByProvider ─────────────────────────────────────────
// Ambil semua credential fields untuk satu provider — dari DB + env fallback.
/**
 * Ambil semua credential fields untuk satu provider — dari DB + env fallback.
 * Cache 15 menit per provider. Dekripsi dilakukan di service (bukan repository).
 * @param providerKode - Kode provider (misal: 'fonnte', 'supabase')
 * @returns Record field_key → nilai plaintext. Kosong jika tidak ada credential.
 */
export async function getCredentialsByProvider(
  providerKode: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const envFields = ENV_FALLBACK[providerKode] ?? {}

  // Coba dari DB (dengan cache)
  try {
    const cached = unstable_cache(
      async () => {
        const creds = await getAllByProvider(providerKode)
        const map: Record<string, string> = {}
        for (const c of creds) {
          try {
            map[c.field_key] = c.is_secret
              ? dekripsi(c.encrypted_value)
              : c.encrypted_value
          } catch {
            // Skip field yang gagal didekripsi
          }
        }
        return map
      },
      [`credentials:provider:${providerKode}`],
      { revalidate: 15 * 60, tags: ['credentials', `credential:${providerKode}`] }
    )

    const fromDB = await cached()
    Object.assign(result, fromDB)
  } catch {
    // DB error — fallback semua ke env
  }

  // Env fallback untuk field yang belum ada dari DB
  for (const [fieldKey, envKey] of Object.entries(envFields)) {
    if (!result[fieldKey]) {
      const val = process.env[envKey]
      if (val) result[fieldKey] = val
    }
  }

  return result
}

// ─── Re-export enkripsi/dekripsi/fingerprint ─────────────────────────────────
// Supaya caller cukup import dari CredentialService saja
export { enkripsi, dekripsi, fingerprint }
