// lib/repositories/tenant.repository.ts
// Repository untuk tabel tenants — akses DB only.
// TIDAK ada logika bisnis — hanya query dan return data.
// Dibuat: Sesi #053 — FIX #6 Audit Logic FASE 1
// Update: Sesi #132 — M6: status 'aktif'→'active', tambah 10 fungsi M6
//
// ARSITEKTUR:
//   Service → TenantRepository → DB (tabel tenants)
//   Dipakai oleh: AccountLockService, OTPService, tenant.service.ts

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  Tenant,
  TenantListItem,
  TenantLifecycleStatus,
  BuatTenantPayload,
  UpdateTenantInfoPayload,
} from '@/lib/types/tenant.types'

// ─── Tipe Legacy (backward compat — dipakai OTPService + AccountLockService) ─

/** Hasil lookup nama brand tenant */
export interface TenantNamaBrandResult {
  id:         string
  nama_brand: string
}

// ─── FUNGSI: findNamaBrandById ───────────────────────────────────────────────
/**
 * Ambil nama_brand tenant berdasarkan ID.
 * Dipakai oleh: OTPService, AccountLockService
 * @param tenantId - UUID tenant yang dicari
 */
export async function findNamaBrandById(
  tenantId: string
): Promise<TenantNamaBrandResult | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenants')
    .select('id, nama_brand')
    .eq('id', tenantId)
    .single()

  if (error || !data) return null
  return data as TenantNamaBrandResult
}

// ─── FUNGSI: findDefaultNamaBrand ────────────────────────────────────────────
/**
 * Ambil nama_brand dari tenant aktif pertama sebagai fallback.
 * Dipakai saat tenantId tidak tersedia (misal: SUPERADMIN send notifikasi).
 * Update S#132: 'aktif' → 'active' (sinkron DB migration).
 */
export async function findDefaultNamaBrand(): Promise<TenantNamaBrandResult | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenants')
    .select('id, nama_brand')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (error || !data) return null
  return data as TenantNamaBrandResult
}

// ─── M6: tenantRepo_findAll ───────────────────────────────────────────────────
/**
 * Ambil list tenant untuk halaman List Tenants dengan filter + pagination.
 */
export async function tenantRepo_findAll(params?: {
  status?: TenantLifecycleStatus
  page?:   number
  limit?:  number
  search?: string
}): Promise<{ data: TenantListItem[]; total: number }> {
  const db    = createServerSupabaseClient()
  const page  = params?.page  ?? 1
  const limit = params?.limit ?? 20
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  let query = db
    .from('tenants')
    .select(
      'id, nama_brand, nama_legal, slug, tenant_display_id, status, tipe, tier, pic_name, created_at',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.status) query = query.eq('status', params.status)
  if (params?.search) {
    query = query.or(
      `nama_brand.ilike.%${params.search}%,nama_legal.ilike.%${params.search}%,slug.ilike.%${params.search}%`
    )
  }

  const { data, count, error } = await query
  if (error || !data) return { data: [], total: 0 }

  // Tambahkan field aggregasi dengan nilai default (diisi di service layer jika perlu)
  const items: TenantListItem[] = (data as Record<string, unknown>[]).map(row => ({
    ...(row as unknown as TenantListItem),
    active_categories: 0,
    active_users:      0,
  }))

  return { data: items, total: count ?? 0 }
}

// ─── M6: tenantRepo_findById ──────────────────────────────────────────────────
/**
 * Ambil detail tenant lengkap. Semua kolom untuk 6 tab Detail Tenant.
 */
export async function tenantRepo_findById(
  tenantId: string
): Promise<Tenant | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  return data as Tenant
}

// ─── M6: tenantRepo_findBySlug ────────────────────────────────────────────────
/**
 * Ambil tenant berdasarkan slug. Untuk validasi uniqueness (create/update).
 */
export async function tenantRepo_findBySlug(
  slug: string,
  excludeId?: string
): Promise<Pick<Tenant, 'id' | 'slug'> | null> {
  const db = createServerSupabaseClient()
  let query = db
    .from('tenants')
    .select('id, slug')
    .eq('slug', slug)
    .is('deleted_at', null)

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null
  return data as Pick<Tenant, 'id' | 'slug'>
}

// ─── M6: tenantRepo_create ────────────────────────────────────────────────────
/**
 * Insert tenant baru (field minimal — Opsi B staged). Status default: 'pending'.
 * Untuk create + PIC sekaligus, gunakan sp_create_tenant_with_pic via Service.
 */
export async function tenantRepo_create(
  payload: BuatTenantPayload,
  createdBy: string
): Promise<Pick<Tenant, 'id' | 'slug' | 'tenant_display_id'> | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenants')
    .insert({
      nama_brand:  payload.nama_brand,
      nama_legal:  payload.nama_legal,
      slug:        payload.slug,
      tipe:        payload.tipe,
      npwp:        payload.npwp,
      pic_name:    payload.pic_name,
      pic_email:   payload.pic_email,
      pic_wa:      payload.pic_wa,
      status:      'pending',
      tier:        'starter',
      created_by:  createdBy,
      updated_by:  createdBy,
    })
    .select('id, slug, tenant_display_id')
    .single()

  if (error || !data) return null
  return data as Pick<Tenant, 'id' | 'slug' | 'tenant_display_id'>
}

// ─── M6: tenantRepo_updateInfo ────────────────────────────────────────────────
/**
 * Partial update field Tab Info Umum (per cluster).
 */
export async function tenantRepo_updateInfo(
  tenantId:  string,
  payload:   UpdateTenantInfoPayload,
  updatedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenants')
    .update({ ...payload, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .is('deleted_at', null)

  return !error
}

// ─── M6: tenantRepo_updateStatus ─────────────────────────────────────────────
/**
 * Update status lifecycle tenant (active/suspended/terminated/expired).
 */
export async function tenantRepo_updateStatus(
  tenantId:  string,
  status:    TenantLifecycleStatus,
  updatedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenants')
    .update({ status, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .is('deleted_at', null)

  return !error
}

// ─── M6: tenantRepo_updateContract ────────────────────────────────────────────
/**
 * Update informasi kontrak (Tab Kontrak Sewa).
 */
export async function tenantRepo_updateContract(
  tenantId:  string,
  input: {
    contract_start_date?:     string | null
    contract_end_date?:       string | null
    contract_file_url?:       string | null
    contract_signed?:         boolean
    contract_signed_at?:      string | null
    contract_status?:         string
    contract_number?:         string
    auto_renewal?:            boolean
    renewal_notice_days?:     number
    early_termination_fee?:   number | null
  },
  updatedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenants')
    .update({ ...input, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .is('deleted_at', null)

  return !error
}

// ─── M6: tenantRepo_updatePICDenorm ───────────────────────────────────────────
/**
 * Update kolom PIC denormalized setelah ganti PIC.
 * Dipanggil oleh tenant-pic.service.ts setelah SP sp_change_tenant_pic berhasil.
 */
export async function tenantRepo_updatePICDenorm(
  tenantId: string,
  input: {
    current_pic_user_id?: string | null
    pic_name:             string
    pic_email:            string | null
    pic_wa:               string | null
  },
  updatedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenants')
    .update({ ...input, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .is('deleted_at', null)

  return !error
}

// ─── M6: tenantRepo_softDelete ────────────────────────────────────────────────
/**
 * Soft delete tenant — set deleted_at.
 * Hanya dari Service layer, tidak langsung dari route.
 */
export async function tenantRepo_softDelete(
  tenantId:  string,
  deletedBy: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenants')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    })
    .eq('id', tenantId)
    .is('deleted_at', null)

  return !error
}
