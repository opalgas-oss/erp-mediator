// ARSIP PRA-ROLLBACK S#248 — credential.repository.ts
// Kondisi saat commit 622d7b7 (setelah S#247, sebelum rollback S#248)
// File asli: lib/repositories/credential.repository.ts
// Berisi: getFieldDefinitionsAll + updateFieldDefIsAktif + filter is_aktif di getFieldDefinitions
// Dibuat arsip: S#248 — 3 Juni 2026 (ATURAN 12/37)

// lib/repositories/credential.repository.ts
// Repository untuk credential service — akses DB via SP.
// Dekripsi TIDAK dilakukan di sini — dilakukan di CredentialService.
// Dibuat: Sesi #051 — BLOK B-07 TODO_ARSITEKTUR_LAYER_v1
// Update: Sesi #107 — M3 Credential Management (+3 fungsi UI dashboard)
// Update: Sesi #216 — tambah getCredentialsByInstanceId (fix envelope decrypt di testKoneksi)
// Update: Sesi #217 — fix getAllByProvider: tambah encrypted_dek untuk backward-compat dekripsi
// Update: Sesi #218 — tambah insertProvider + insertFieldDef untuk fitur Tambah Provider SA
// Update: Sesi #246 — C5 HUTANG-PROVIDER-INACTIVE-TOGGLE: +is_aktif di getFieldDefinitions SELECT+filter, +getFieldDefinitionsAll, +updateFieldDefIsAktif

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
    .select(`id, kode, nama, kategori, deskripsi, docs_url, status_url, tag, is_aktif, sort_order, provider_instances(health_status)`)
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
    else if (statuses.length > 0 && statuses.every(s => s === 'sehat')) health_overall = 'sehat'
    return { id: p.id, kode: p.kode, nama: p.nama, kategori: p.kategori, deskripsi: p.deskripsi, docs_url: p.docs_url, status_url: p.status_url, tag: p.tag as ServiceProvider['tag'], is_aktif: p.is_aktif, sort_order: p.sort_order, health_overall }
  })
}

export async function getInstancesByProvider(providerId: string): Promise<ProviderInstance[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('provider_instances')
    .select(`id, provider_id, nama_server, deskripsi, is_aktif, is_default, health_status, health_pesan, last_tested_at, created_at, updated_at`)
    .eq('provider_id', providerId)
    .order('created_at')
  if (error) throw new Error(`[credential.repository] getInstancesByProvider: ${error.message}`)
  return (data ?? []) as ProviderInstance[]
}

/**
 * S#246: tambah is_aktif di SELECT + filter .eq('is_aktif', true)
 */
export async function getFieldDefinitions(providerId: string): Promise<ProviderFieldDef[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('provider_field_definitions')
    .select(`id, provider_id, field_key, label, tipe, is_required, is_secret, is_aktif, options, placeholder, deskripsi, panduan_langkah, deep_link_url, prefix_sandbox, prefix_production, nilai_default, sort_order`)
    .eq('provider_id', providerId)
    .eq('is_aktif', true)
    .order('sort_order')
  if (error) throw new Error(`[credential.repository] getFieldDefinitions: ${error.message}`)
  return (data ?? []) as ProviderFieldDef[]
}

/**
 * S#246: fungsi baru HUTANG-PROVIDER-INACTIVE-TOGGLE C5
 */
export async function getFieldDefinitionsAll(providerId: string): Promise<ProviderFieldDef[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('provider_field_definitions')
    .select(`id, provider_id, field_key, label, tipe, is_required, is_secret, is_aktif, options, placeholder, deskripsi, panduan_langkah, deep_link_url, prefix_sandbox, prefix_production, nilai_default, sort_order`)
    .eq('provider_id', providerId)
    .order('sort_order')
  if (error) throw new Error(`[credential.repository] getFieldDefinitionsAll: ${error.message}`)
  return (data ?? []) as ProviderFieldDef[]
}

/**
 * S#246: fungsi baru HUTANG-PROVIDER-INACTIVE-TOGGLE C5
 */
export async function updateFieldDefIsAktif(params: { fieldDefId: string; isAktif: boolean }): Promise<void> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('provider_field_definitions')
    .update({ is_aktif: params.isAktif })
    .eq('id', params.fieldDefId)
  if (error) throw new Error(`[credential.repository] updateFieldDefIsAktif: ${error.message}`)
}

// [fungsi-fungsi lain tetap sama — getCredentialFingerprints, getProviderByInstanceId,
//  insertInstance, upsertCredential, insertProvider, insertFieldDef, spTestProviderConnection]
// Arsip ini fokus pada bagian yang berubah saat rollback S#248
