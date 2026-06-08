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
    .eq('lifecycle_status', 'active')   // STATUS-REDESIGN S#212 (was: .eq('status', 'active'))
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
      'id, nama_brand, nama_legal, slug, tenant_display_id, lifecycle_status, tipe, tier, admintenant_name, created_at',   // STATUS-REDESIGN S#212 + K-18 S#238
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.status) query = query.eq('lifecycle_status', params.status)   // STATUS-REDESIGN S#212
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

// ─── M6: tenantRepo_createWithPIC ───────────────────────────────────────────
/**
 * Buat tenant baru + PIC awal sekaligus via SP sp_create_tenant_with_pic (transactional).
 * Menggantikan direct db.rpc() yang sebelumnya ada di TenantService_create.
 * Dipanggil oleh: TenantService_create (tenant.service.ts)
 * Update: Sesi #179 — PV-04: pindah dari service layer ke repository layer
 * @returns tenant_id (UUID string) dari SP
 */
export async function tenantRepo_createWithPIC(
  payload:   BuatTenantPayload,
  createdBy: string
): Promise<string> {
  // Step 1: Insert tenant record (lifecycle_status='in_registration', register_status='pending')
  // sp_create_tenant_with_pic TIDAK DIPAKAI — SP tersebut BROKEN (referensi kolom status/pic_*/tipe_pic
  // yang sudah di-DROP/RENAMED di S#212+S#238). SP di-queue DROP setelah TC-AT selesai (BUG-028).
  const tenant = await tenantRepo_create(payload, createdBy)
  if (!tenant) throw new Error('Gagal membuat tenant')

  // Step 2: Insert AT awal ke tenant_admintenant_history + update denormalized admintenant_* di tenants
  // p_user_id=NULL karena akun Supabase Auth AT belum dibuat saat ini — dibuat saat AT klik aktivasi
  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_tambah_admintenant', {
    p_tenant_id:     tenant.id,
    p_user_id:       null,
    p_user_name:     payload.admintenant_name.trim(),
    p_user_email:    payload.admintenant_email.trim().toLowerCase(),
    p_user_wa:       payload.admintenant_wa.replace(/\D/g, ''),
    p_jabatan:       'penanggung_jawab',   // AT awal selalu Penanggung Jawab
    p_relasi:        null,                  // diisi saat onboarding lengkap
    p_assigned_by:   createdBy,
    p_update_kontak: true,                 // update admintenant_* di tenants row
  })
  if (error) throw new Error(`Gagal mendaftarkan AdminTenant awal: ${error.message}`)

  return tenant.id
}

// ─── M6: tenantRepo_create ────────────────────────────────────────────────────
/**
 * Insert tenant baru (field minimal — Opsi B staged). Status default: 'pending'.
 * Untuk create + PIC sekaligus (transactional), gunakan tenantRepo_createWithPIC.
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
      // admintenant_* fields tidak diset di sini — diupdate oleh sp_tambah_admintenant via p_update_kontak=TRUE
      lifecycle_status: 'in_registration',   // FIX TEN-1 (CASE SESI-11): nilai awal saat tenant submit register
      register_status: 'pending',             // nilai awal saat submit — belum di-review SA
      tier:        payload.tier ?? 'starter',
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
    .update({ lifecycle_status: status, updated_by: updatedBy, updated_at: new Date().toISOString() })   // STATUS-REDESIGN S#212
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
    current_admintenant_user_id?: string | null   // RENAMED K-18 S#238 (was: current_pic_user_id)
    admintenant_name:             string          // RENAMED K-18 S#238 (was: pic_name)
    admintenant_email:            string | null   // RENAMED K-18 S#238 (was: pic_email)
    admintenant_wa:               string | null   // RENAMED K-18 S#238 (was: pic_wa)
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
