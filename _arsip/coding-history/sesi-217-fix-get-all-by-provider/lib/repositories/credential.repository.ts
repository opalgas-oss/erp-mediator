// ARSIP S#217 — PRE-FIX getAllByProvider
// Original: lib/repositories/credential.repository.ts
// Masalah: getAllByProvider tidak select encrypted_dek → getCredentialsByProvider pakai dekripsi() salah
// lib/repositories/credential.repository.ts
// Repository untuk credential service — akses DB via SP.
// Dekripsi TIDAK dilakukan di sini — dilakukan di CredentialService.
// Dibuat: Sesi #051 — BLOK B-07 TODO_ARSITEKTUR_LAYER_v1
// Update: Sesi #107 — M3 Credential Management (+3 fungsi UI dashboard)
// Update: Sesi #216 — tambah getCredentialsByInstanceId (fix envelope decrypt di testKoneksi)

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  ServiceProvider,
  ProviderInstance,
  ProviderFieldDef,
  InstanceCredential,
  HealthStatus,
} from '@/lib/types/provider.types'

export interface CredentialResult {
  status:          'FOUND' | 'NOT_FOUND'
  encrypted_value: string | null
  is_secret:       boolean | null
}

interface CredWithDef {
  encrypted_value: string
  provider_field_definitions: { field_key: string; is_secret: boolean } |
    Array<{ field_key: string; is_secret: boolean }> | null
}

interface CredWithDefAndDek {
  field_def_id:    string
  encrypted_dek:   string
  encrypted_value: string
  provider_field_definitions: { field_key: string; is_secret: boolean } |
    Array<{ field_key: string; is_secret: boolean }> | null
}

export async function spGetCredential(params: {
  providerKode: string
  fieldKey:     string
}): Promise<CredentialResult> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_get_credential', {
    p_provider_kode: params.providerKode,
    p_field_key:     params.fieldKey,
  })
  if (error) throw new Error(`[credential.repository] spGetCredential: ${error.message}`)
  return data as CredentialResult
}

export async function getAllByProvider(providerKode: string): Promise<
  Array<{ field_key: string; encrypted_value: string; is_secret: boolean }>
> {
  const db = createServerSupabaseClient()
  const { data: provider } = await db
    .from('service_providers').select('id')
    .eq('kode', providerKode).eq('is_aktif', true).single()
  if (!provider) return []
  const { data: instance } = await db
    .from('provider_instances').select('id')
    .eq('provider_id', provider.id).eq('is_aktif', true).eq('is_default', true).single()
  if (!instance) return []
  const { data: creds } = await db
    .from('instance_credentials')
    .select('encrypted_value, provider_field_definitions!inner(field_key, is_secret)')
    .eq('instance_id', instance.id)
  if (!creds || creds.length === 0) return []
  return (creds as unknown as CredWithDef[]).map(c => {
    const def = Array.isArray(c.provider_field_definitions) ? c.provider_field_definitions[0] : c.provider_field_definitions
    return { field_key: def?.field_key ?? '', encrypted_value: c.encrypted_value, is_secret: def?.is_secret ?? false }
  }).filter(c => c.field_key !== '')
}
