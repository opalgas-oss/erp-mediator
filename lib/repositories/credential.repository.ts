// lib/repositories/credential.repository.ts
// Repository untuk credential service — akses DB via SP.
// Dekripsi TIDAK dilakukan di sini — dilakukan di CredentialService.
// Dibuat: Sesi #051 — BLOK B-07 TODO_ARSITEKTUR_LAYER_v1
// Update: Sesi #107 — M3 Credential Management (+3 fungsi UI dashboard)
// Update: Sesi #216 — tambah getCredentialsByInstanceId (fix envelope decrypt di testKoneksi)
// Update: Sesi #217 — fix getAllByProvider: tambah encrypted_dek untuk backward-compat dekripsi
// Update: Sesi #218 — tambah insertProvider + insertFieldDef untuk fitur Tambah Provider SA
// Update: Sesi #248 — ROLLBACK: hapus getFieldDefinitionsAll + updateFieldDefIsAktif + filter is_aktif
// Update: Sesi #249 — HUTANG-PROVIDER-INACTIVE: tambah updateProviderIsAktif + getProvidersWithStatus ambil semua (aktif+nonaktif)
// Update: Sesi #288 — FASE 2 use_case: tambah updateInstanceUseCases + getProvidersWithStatus select use_cases dari instances

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

/**
 * Panggil SP sp_get_credential — ambil credential terenkripsi satu field.
 * Dekripsi TIDAK dilakukan di sini — dilakukan di CredentialService.
 */
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

/**
 * Ambil semua credential fields untuk satu provider — join 4 tabel.
 * Dekripsi TIDAK dilakukan di sini — dilakukan di CredentialService.
 */
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
      encrypted_dek:   c.encrypted_dek ?? null,   // S#217: null jika data lama tanpa DEK
      encrypted_value: c.encrypted_value,
      is_secret:       def?.is_secret ?? false,
    }
  }).filter(c => c.field_key !== '')
}

// ─── Repository (M3 — UI Dashboard) — Sesi #107 ─────────────────────────────

/**
 * Ambil credential fields untuk satu instance, dengan encrypted_dek.
 * Dipakai oleh testKoneksi() untuk dekripsi dengan dekripsiCredential (envelope encryption).
 * S#216 — Bug fix: getAllByProvider hanya return encrypted_value, tidak cukup untuk envelope decrypt.
 */
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

/**
 * Ambil semua provider aktif beserta health_overall.
 * health_overall dihitung dari semua instance milik provider:
 *   gagal > peringatan > belum_dites > sehat
 */
export async function getProvidersWithStatus(): Promise<ServiceProvider[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('service_providers')
    .select(`
      id, kode, nama, kategori, deskripsi, docs_url, status_url,
      tag, is_aktif, sort_order,
      provider_instances(health_status, use_cases)
    `)
    .order('sort_order')

  if (error) throw new Error(`[credential.repository] getProvidersWithStatus: ${error.message}`)
  if (!data) return []

  return data.map(p => {
    const instances = (p.provider_instances as Array<{ health_status: string; use_cases: string[] }>) ?? []
    const statuses  = instances.map(i => i.health_status as HealthStatus)
    // Union semua use_cases dari semua instance aktif
    const useCasesUnion = [...new Set(instances.flatMap(i => i.use_cases ?? []))]

    let health_overall: HealthStatus = 'belum_dites'
    if (statuses.includes('gagal'))           health_overall = 'gagal'
    else if (statuses.includes('peringatan')) health_overall = 'peringatan'
    else if (statuses.includes('sehat'))      health_overall = 'sehat'

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
      use_cases:      useCasesUnion,
    }
  })
}

/**
 * Ambil semua instance untuk satu provider berdasarkan provider_id.
 */
export async function getInstancesByProvider(providerId: string): Promise<ProviderInstance[]> {
  const db = createServerSupabaseClient()

  const { data, error } = await db
    .from('provider_instances')
    .select(`
      id, provider_id, nama_server, deskripsi,
      is_aktif, is_default, health_status, health_pesan,
      use_cases, last_tested_at, created_at, updated_at
    `)
    .eq('provider_id', providerId)
    .order('created_at')

  if (error) throw new Error(`[credential.repository] getInstancesByProvider: ${error.message}`)
  return (data ?? []) as ProviderInstance[]
}

/**
 * Ambil field definitions untuk satu provider.
 * Dipakai untuk render dialog Isi Credential (form isi credential).
 */
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

/**
 * Ambil credential (fingerprint saja — bukan nilai asli) per instance.
 * Dipakai di UI untuk tampilkan status pengisian per field.
 * Nilai terenkripsi TIDAK di-expose — hanya fingerprint 4 karakter.
 */
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

/**
 * Ambil provider_id + kode provider berdasarkan instance_id.
 * Dipakai oleh testKoneksi() agar tidak perlu loop semua provider.
 */
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

/**
 * Insert instance baru untuk satu provider.
 * Jika is_default = true, unset is_default semua instance lain provider tersebut dulu.
 */
export async function insertInstance(payload: {
  provider_id: string
  nama_server: string
  deskripsi:   string | null
  is_default:  boolean
  created_by:  string
}): Promise<ProviderInstance> {
  const db = createServerSupabaseClient()

  // Jika is_default = true → unset semua is_default existing dulu
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

/**
 * Upsert satu field credential — enkripsi sudah dilakukan di Service sebelum masuk sini.
 * Pakai UPSERT agar idempotent: update jika sudah ada, insert jika belum.
 */
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

/**
 * Insert provider baru ke service_providers.
 * Kode harus sudah di-generate dan di-validasi unik di service layer sebelum masuk sini.
 * S#218 — fitur Tambah Provider dashboard SA.
 */
export async function insertProvider(payload: {
  kode:      string
  nama:      string
  kategori:  string
  tag:       string
  deskripsi: string | null
  docs_url:  string | null
}): Promise<ServiceProvider> {
  const db = createServerSupabaseClient()

  // Ambil sort_order max untuk auto-increment
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
    // Tangkap UNIQUE violation kode untuk pesan error yang informatif
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

/**
 * Insert satu field definition untuk satu provider.
 * Dipakai loop per field di service layer.
 * S#218 — fitur Tambah Provider dashboard SA.
 */
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

/**
 * Update is_aktif satu provider.
 * Dipakai oleh toggleProviderIsAktif di service layer.
 * S#249 — HUTANG-PROVIDER-INACTIVE.
 */
export async function updateProviderIsAktif(
  providerId: string,
  isAktif:    boolean
): Promise<void> {
  const db = createServerSupabaseClient()

  const { error } = await db
    .from('service_providers')
    .update({ is_aktif: isAktif })
    .eq('id', providerId)

  if (error) throw new Error(`[credential.repository] updateProviderIsAktif: ${error.message}`)
}

/**
 * Update use_cases satu instance.
 * Dipakai oleh updateInstanceUseCases di service layer.
 * S#288 — FASE 2 use_case.
 */
export async function updateInstanceUseCases(
  instanceId: string,
  useCases:   string[]
): Promise<void> {
  const db = createServerSupabaseClient()

  const { error } = await db
    .from('provider_instances')
    .update({ use_cases: useCases })
    .eq('id', instanceId)

  if (error) throw new Error(`[credential.repository] updateInstanceUseCases: ${error.message}`)
}

/**
 * Panggil SP sp_test_provider_connection — simpan hasil authenticated test.
 * SP diupdate S#109: +p_is_authenticated + p_auth_error.
 */
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
