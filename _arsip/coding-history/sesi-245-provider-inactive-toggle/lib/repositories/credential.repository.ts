// ARSIP PRE-EDIT S#245 — credential.repository.ts
// Dibuat: 2 Juni 2026 — sebelum STEP 1 Inactive Toggle
// lib/repositories/credential.repository.ts
// Repository untuk credential service — akses DB via SP.
// Dekripsi TIDAK dilakukan di sini — dilakukan di CredentialService.
// Dibuat: Sesi #051 — BLOK B-07 TODO_ARSITEKTUR_LAYER_v1
// Update: Sesi #107 — M3 Credential Management (+3 fungsi UI dashboard)
// Update: Sesi #216 — tambah getCredentialsByInstanceId (fix envelope decrypt di testKoneksi)
// Update: Sesi #217 — fix getAllByProvider: tambah encrypted_dek untuk backward-compat dekripsi
// Update: Sesi #218 — tambah insertProvider + insertFieldDef untuk fitur Tambah Provider SA

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  ServiceProvider,
  ProviderInstance,
  ProviderFieldDef,
  InstanceCredential,
  HealthStatus,
} from '@/lib/types/provider.types'

// ─── Tipe Data (existing) ────────────────────────────────────────────────────

export interface CredentialResult {
  status:          'FOUND' | 'NOT_FOUND'
  encrypted_value: string | null
  is_secret:       boolean | null
}

interface CredWithDef {
  encrypted_dek?:  string | null   // S#217: tambah untuk backward-compat dekripsiCredential
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

// ─── Repository (existing) ───────────────────────────────────────────────────

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
  Array<{ field_key: string; encrypted_dek?: string | null; encrypted_value: string; is_secret: boolean }>
> {
  const db = createServerSupabaseClient()

  const { data: provider } = await db
    .from('service_providers')
    .select('id')
    .eq('kode', providerKode)
    .eq('is_aktif', true)
    .single()

  if (!provider) return []

  const { data: instance } = await db
    .from('provider_instances')
    .select('id')
    .eq('provider_id', provider.id)
    .eq('is_aktif', true)
    .eq('is_default', true)
    .single()

  if (!instance) return []

  const { data: creds } = await db
    .from('instance_credentials')
    .select('encrypted_dek, encrypted_value, provider_field_definitions!inner(field_key, is_secret)')
    .eq('instance_id', instance.id)

  if (!creds || creds.length === 0) return []

  return (creds as unknown as CredWithDef[]).map(c => {
    const def = Array.isArray(c.provider_field_definitions)
      ? c.provider_field_definitions[0]
      : c.provider_field_definitions
    return {
      field_key:       def?.field_key ?? '',
      encrypted_dek:   c.encrypted_dek ?? null,
      encrypted_value: c.encrypted_value,
      is_secret:       def?.is_secret ?? false,
    }
  }).filter(c => c.field_key !== '')
}

export async function getCredentialsByInstanceId(instanceId: string): Promise<
  Array<{ field_key: string; field_def_id: string; encrypted_dek: string; encrypted_value: string; is_secret: boolean }>
> {
  const db = createServerSupabaseClient()

  const { data: creds } = await db
    .from('instance_credentials')
    .select('field_def_id, encrypted_dek, encrypted_value, provider_field_definitions!inner(field_key, is_secret)')
    .eq('instance_id', instanceId)

  if (!creds || creds.length === 0) return []

  return (creds as unknown as CredWithDefAndDek[]).map(c => {
    const def = Array.isArray(c.provider_field_definitions)
      ? c.provider_field_definitions[0]
      : c.provider_field_definitions
    return {
      field_key:       def?.field_key ?? '',
      field_def_id:    c.field_def_id,
      encrypted_dek:   c.encrypted_dek,
      encrypted_value: c.encrypted_value,
      is_secret:       def?.is_secret ?? false,
    }
  }).filter(c => c.field_key !== '')
}

export async function getProvidersWithStatus(): Promise<ServiceProvider[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('service_providers')
    .select(`
      id, kode, nama, kategori, deskripsi, docs_url, status_url,
      tag, is_aktif, sort_order,
      provider_instances(health_status)
    `)
    .eq('is_aktif', true)
    .order('sort_order')

  if (error) throw new Error(`[credential.repository] getProvidersWithStatus: ${error.message}`)
  if (!data) return []

  return data.map(p => {
    const instances = (p.provider_instances as Array<{ health_status: string }>) ?? []
    const statuses  = instances.map(i => i.health_status as HealthStatus)

    let health_overall: HealthStatus = 'belum_dites'
    if (statuses.includes('gagal'))           health_overall = 'gagal'
    else if (statuses.includes('peringatan')) health_overall = 'peringatan'
    else if (statuses.length > 0 && statuses.every(s => s === 'sehat'))
      health_overall = 'sehat'

    return {
      id:             p.id,
      kode:           p.kode,
      nama:           p.nama,
      kategori:       p.kategori,
      deskripsi:      p.deskripsi,
      docs_url:       p.docs_url,
      status_url:     p.status_url,
      tag:            p.tag as ServiceProvider['tag'],
      is_aktif:       p.is_aktif,
      sort_order:     p.sort_order,
      health_overall,
    }
  })
}

export async function getInstancesByProvider(providerId: string): Promise<ProviderInstance[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('provider_instances')
    .select(`
      id, provider_id, nama_server, deskripsi,
      is_aktif, is_default, health_status, health_pesan,
      last_tested_at, created_at, updated_at
    `)
    .eq('provider_id', providerId)
    .order('created_at')

  if (error) throw new Error(`[credential.repository] getInstancesByProvider: ${error.message}`)
  return (data ?? []) as ProviderInstance[]
}

export async function getFieldDefinitions(providerId: string): Promise<ProviderFieldDef[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('provider_field_definitions')
    .select(`
      id, provider_id, field_key, label, tipe,
      is_required, is_secret, options, placeholder, deskripsi,
      panduan_langkah, deep_link_url, prefix_sandbox, prefix_production,
      nilai_default, sort_order
    `)
    .eq('provider_id', providerId)
    .order('sort_order')

  if (error) throw new Error(`[credential.repository] getFieldDefinitions: ${error.message}`)
  return (data ?? []) as ProviderFieldDef[]
}

export async function getCredentialFingerprints(instanceId: string): Promise<InstanceCredential[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('instance_credentials')
    .select(`
      field_def_id, fingerprint, is_secret: provider_field_definitions(is_secret),
      updated_at,
      field_key: provider_field_definitions(field_key)
    `)
    .eq('instance_id', instanceId)

  if (error) throw new Error(`[credential.repository] getCredentialFingerprints: ${error.message}`)
  if (!data) return []

  return data.map((row: Record<string, unknown>) => ({
    field_def_id: row.field_def_id as string,
    field_key:    (row.field_key as { field_key: string } | null)?.field_key ?? '',
    fingerprint:  row.fingerprint as string | null,
    is_secret:    (row.is_secret as { is_secret: boolean } | null)?.is_secret ?? false,
    updated_at:   row.updated_at as string,
  }))
}

export async function getProviderByInstanceId(
  instanceId: string
): Promise<{ provider_id: string; kode: string } | null> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('provider_instances')
    .select('provider_id, service_providers!inner(kode)')
    .eq('id', instanceId)
    .single()

  if (error || !data) return null

  const kode = (data.service_providers as unknown as { kode: string })?.kode ?? null
  if (!kode) return null

  return { provider_id: data.provider_id, kode }
}

export async function insertInstance(payload: {
  provider_id: string
  nama_server: string
  deskripsi:   string | null
  is_default:  boolean
  created_by:  string
}): Promise<ProviderInstance> {
  const db = createServerSupabaseClient()

  if (payload.is_default) {
    await db
      .from('provider_instances')
      .update({ is_default: false })
      .eq('provider_id', payload.provider_id)
  }

  const { data, error } = await db
    .from('provider_instances')
    .insert({
      provider_id: payload.provider_id,
      nama_server: payload.nama_server,
      deskripsi:   payload.deskripsi,
      is_default:  payload.is_default,
      created_by:  payload.created_by,
    })
    .select()
    .single()

  if (error) throw new Error(`[credential.repository] insertInstance: ${error.message}`)
  return data as ProviderInstance
}

export async function upsertCredential(params: {
  instance_id:     string
  field_def_id:    string
  encrypted_dek:   string
  encrypted_value: string
  fingerprint:     string
  updated_by:      string
}): Promise<void> {
  const db = createServerSupabaseClient()

  const { error } = await db
    .from('instance_credentials')
    .upsert({
      instance_id:     params.instance_id,
      field_def_id:    params.field_def_id,
      encrypted_dek:   params.encrypted_dek,
      encrypted_value: params.encrypted_value,
      fingerprint:     params.fingerprint,
      key_version:     1,
      updated_by:      params.updated_by,
    }, {
      onConflict: 'instance_id,field_def_id',
    })

  if (error) throw new Error(`[credential.repository] upsertCredential: ${error.message}`)
}

export async function insertProvider(payload: {
  kode:      string
  nama:      string
  kategori:  string
  tag:       string
  deskripsi: string | null
  docs_url:  string | null
}): Promise<ServiceProvider> {
  const db = createServerSupabaseClient()

  const { data: maxRow } = await db
    .from('service_providers')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await db
    .from('service_providers')
    .insert({
      kode:       payload.kode,
      nama:       payload.nama,
      kategori:   payload.kategori,
      tag:        payload.tag,
      deskripsi:  payload.deskripsi,
      docs_url:   payload.docs_url,
      is_aktif:   true,
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`KODE_DUPLIKAT: Kode provider "${payload.kode}" sudah dipakai`)
    }
    throw new Error(`[credential.repository] insertProvider: ${error.message}`)
  }

  return {
    ...data,
    health_overall: 'belum_dites',
  } as ServiceProvider
}

export async function insertFieldDef(payload: {
  provider_id: string
  field_key:   string
  label:       string
  tipe:        string
  is_required: boolean
  is_secret:   boolean
  placeholder: string | null
  deskripsi:   string | null
  sort_order:  number
}): Promise<void> {
  const db = createServerSupabaseClient()

  const { error } = await db
    .from('provider_field_definitions')
    .insert({
      provider_id: payload.provider_id,
      field_key:   payload.field_key,
      label:       payload.label,
      tipe:        payload.tipe,
      is_required: payload.is_required,
      is_secret:   payload.is_secret,
      placeholder: payload.placeholder,
      deskripsi:   payload.deskripsi,
      sort_order:  payload.sort_order,
    })

  if (error) throw new Error(`[credential.repository] insertFieldDef: ${error.message}`)
}

export async function spTestProviderConnection(params: {
  instanceId:       string
  healthStatus:     HealthStatus
  errorMessage?:    string
  isAuthenticated?: boolean | null
  authError?:       string
}): Promise<void> {
  const db = createServerSupabaseClient()

  const { error } = await db.rpc('sp_test_provider_connection', {
    p_instance_id:      params.instanceId,
    p_health_status:    params.healthStatus,
    p_error_message:    params.errorMessage    ?? null,
    p_is_authenticated: params.isAuthenticated ?? null,
    p_auth_error:       params.authError       ?? null,
  })

  if (error) throw new Error(`[credential.repository] spTestProviderConnection: ${error.message}`)
}
