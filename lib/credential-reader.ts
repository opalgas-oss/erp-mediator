// lib/credential-reader.ts
// ⚠️ DEPRECATED Sesi #052 — Digantikan oleh:
//   lib/services/credential.service.ts (CredentialService)
//   CredentialService menggabungkan credential-reader + credential-crypto.
//   File ini TIDAK BOLEH diimport dari file baru.
//   Akan dihapus setelah verifikasi tidak ada caller tersisa.
// Membaca credential service dari tabel instance_credentials di PostgreSQL.
// Jika belum ada di database, fallback otomatis ke environment variable.

import 'server-only'
import { unstable_cache }             from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { dekripsi }                   from '@/lib/credential-crypto'

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

// ─── Tipe internal untuk hasil join Supabase ──────────────────────────────────
interface FieldDef {
  field_key: string
  is_secret: boolean
}

interface CredWithDef {
  encrypted_value: string
  provider_field_definitions: FieldDef | FieldDef[] | null
}

function extractFieldDef(raw: FieldDef | FieldDef[] | null): FieldDef | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

// ─── FUNGSI UTAMA: getCredential ─────────────────────────────────────────────
export async function getCredential(
  providerKode: string,
  fieldKey: string
): Promise<string | null> {
  const fromDB = await tryGetFromDB(providerKode, fieldKey)
  if (fromDB !== null) return fromDB

  const envKey = ENV_FALLBACK[providerKode]?.[fieldKey]
  if (envKey) {
    const envVal = process.env[envKey] ?? null
    if (envVal) return envVal
  }

  return null
}

// ─── Internal: baca dari database dengan cache ────────────────────────────────
async function tryGetFromDB(
  providerKode: string,
  fieldKey: string
): Promise<string | null> {
  try {
    const cached = unstable_cache(
      async () => {
        const db = createServerSupabaseClient()

        const { data: provider } = await db
          .from('service_providers')
          .select('id')
          .eq('kode', providerKode)
          .eq('is_aktif', true)
          .single()

        if (!provider) return null

        const { data: instance } = await db
          .from('provider_instances')
          .select('id')
          .eq('provider_id', provider.id)
          .eq('is_aktif', true)
          .eq('is_default', true)
          .single()

        if (!instance) return null

        const { data: fieldDef } = await db
          .from('provider_field_definitions')
          .select('id, is_secret')
          .eq('provider_id', provider.id)
          .eq('field_key', fieldKey)
          .single()

        if (!fieldDef) return null

        const { data: cred } = await db
          .from('instance_credentials')
          .select('encrypted_value')
          .eq('instance_id', instance.id)
          .eq('field_def_id', fieldDef.id)
          .single()

        if (!cred) return null

        if (fieldDef.is_secret) {
          return dekripsi(cred.encrypted_value)
        }
        return cred.encrypted_value
      },
      [`credential:${providerKode}:${fieldKey}`],
      { revalidate: 15 * 60, tags: ['credentials', `credential:${providerKode}`] }
    )

    return await cached()
  } catch {
    return null
  }
}

// ─── FUNGSI: getCredentialsByProvider ────────────────────────────────────────
export async function getCredentialsByProvider(
  providerKode: string
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const envFields = ENV_FALLBACK[providerKode] ?? {}

  try {
    const cached = unstable_cache(
      async () => {
        const db = createServerSupabaseClient()

        const { data: provider } = await db
          .from('service_providers')
          .select('id')
          .eq('kode', providerKode)
          .eq('is_aktif', true)
          .single()

        if (!provider) return {}

        const { data: instance } = await db
          .from('provider_instances')
          .select('id')
          .eq('provider_id', provider.id)
          .eq('is_aktif', true)
          .eq('is_default', true)
          .single()

        if (!instance) return {}

        const { data: creds } = await db
          .from('instance_credentials')
          .select('encrypted_value, provider_field_definitions!inner(field_key, is_secret)')
          .eq('instance_id', instance.id)

        if (!creds || creds.length === 0) return {}

        const map: Record<string, string> = {}
        for (const c of (creds as unknown as CredWithDef[])) {
          const def = extractFieldDef(c.provider_field_definitions)
          if (!def) continue
          try {
            map[def.field_key] = def.is_secret
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
    // DB error → semua dari env fallback
  }

  for (const [fieldKey, envKey] of Object.entries(envFields)) {
    if (!result[fieldKey]) {
      const val = process.env[envKey]
      if (val) result[fieldKey] = val
    }
  }

  return result
}
