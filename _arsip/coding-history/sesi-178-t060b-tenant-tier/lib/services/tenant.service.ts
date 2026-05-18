// lib/services/tenant.service.ts — PRE-FIX T-060b S#178
// Snapshot sebelum: tambah p_tier ke rpc sp_create_tenant_with_pic + import TenantTier
// TenantService_create hardcode tier='starter' via SP — SA tidak bisa pilih tier saat buat tenant
//
// Dibuat: Sesi #132. Update Sesi #174 SL-D003.

import 'server-only'
import {
  tenantRepo_findAll, tenantRepo_findById, tenantRepo_findBySlug,
  tenantRepo_updateInfo, tenantRepo_updateStatus, tenantRepo_updateContract,
} from '@/lib/repositories/tenant.repository'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateNomorWa } from '@/lib/utils/validation.server'
import type {
  Tenant, TenantListFilter, TenantListResponse, BuatTenantPayload,
  UpdateTenantInfoPayload, TenantLifecycleStatus, TenantContractStatus,
} from '@/lib/types/tenant.types'

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

function validateSlug(slug: string): void {
  if (!slug || slug.length < 2 || slug.length > 50) throw new Error('Kode tenant harus 2–50 karakter')
  if (!SLUG_REGEX.test(slug)) throw new Error('Kode tenant hanya boleh huruf kecil, angka, dan tanda hubung (-)')
}

function validateNpwp(npwp: string): void {
  const digits = npwp.replace(/\D/g, '')
  if (digits.length !== 15 && digits.length !== 16) throw new Error('NPWP harus 15 digit (format lama) atau 16 digit (NIK baru)')
}

export async function TenantService_list(params?: TenantListFilter): Promise<TenantListResponse> {
  const page = params?.page ?? 1; const limit = params?.limit ?? 20
  const status = params?.status === 'all' ? undefined : params?.status
  const result = await tenantRepo_findAll({ ...params, status })
  return { ...result, page, limit }
}

export async function TenantService_getById(tenantId: string): Promise<Tenant | null> {
  if (!tenantId) throw new Error('ID tenant wajib diisi')
  return tenantRepo_findById(tenantId)
}

// PRE-FIX: SP call tidak passing p_tier — SP hardcode 'starter'
export async function TenantService_create(input: BuatTenantPayload, createdBy: string): Promise<{ tenant_id: string; display_id: string }> {
  validateSlug(input.slug); validateNpwp(input.npwp); validateNomorWa(input.pic_wa)
  if (!input.nama_brand.trim()) throw new Error('Nama brand wajib diisi')
  if (!input.nama_legal.trim()) throw new Error('Nama legal wajib diisi')
  if (!input.pic_name.trim())   throw new Error('Nama PIC wajib diisi')
  if (!input.pic_email.trim())  throw new Error('Email PIC wajib diisi')
  const existing = await tenantRepo_findBySlug(input.slug)
  if (existing) throw new Error(`Kode tenant "${input.slug}" sudah digunakan. Coba "${input.slug}-2"`)
  const db = createServerSupabaseClient()
  const { data, error } = await db.rpc('sp_create_tenant_with_pic', {
    p_nama_brand: input.nama_brand.trim(), p_nama_legal: input.nama_legal.trim(),
    p_slug: input.slug, p_tipe: input.tipe, p_npwp: input.npwp.replace(/\D/g, ''),
    p_pic_name: input.pic_name.trim(), p_pic_email: input.pic_email.trim().toLowerCase(),
    p_pic_wa: input.pic_wa.replace(/\D/g, ''), p_created_by: createdBy,
    // p_tier: TIDAK ADA — SP hardcode 'starter'
  })
  if (error) throw new Error(`Gagal membuat tenant: ${error.message}`)
  const tenantId = data as string
  const tenant = await tenantRepo_findById(tenantId)
  const displayId = tenant?.tenant_display_id ?? tenantId
  return { tenant_id: tenantId, display_id: displayId }
}

export async function TenantService_update(tenantId: string, input: UpdateTenantInfoPayload, updatedBy: string): Promise<void> {
  if (input.nomor_wa_bisnis) validateNomorWa(input.nomor_wa_bisnis)
  if (input.npwp) validateNpwp(input.npwp)
  const ok = await tenantRepo_updateInfo(tenantId, input, updatedBy)
  if (!ok) throw new Error('Gagal mengupdate tenant. Pastikan tenant masih aktif.')
}

export async function TenantService_updateLifecycleStatus(tenantId: string, newStatus: TenantLifecycleStatus, alasan: string | null, updatedBy: string): Promise<void> {
  const tenant = await tenantRepo_findById(tenantId)
  if (!tenant) throw new Error('Tenant tidak ditemukan')
  const validTransitions: Record<TenantLifecycleStatus, TenantLifecycleStatus[]> = {
    pending: ['active','terminated'], active: ['suspended','terminated'],
    suspended: ['active','terminated'], expired: ['active','terminated'], terminated: [],
  }
  if (!validTransitions[tenant.status].includes(newStatus)) throw new Error(`Tidak bisa mengubah status dari "${tenant.status}" ke "${newStatus}"`)
  if (['suspended','terminated'].includes(newStatus) && !alasan?.trim()) throw new Error('Alasan wajib diisi untuk aksi ini')
  const ok = await tenantRepo_updateStatus(tenantId, newStatus, updatedBy)
  if (!ok) throw new Error('Gagal mengupdate status tenant')
}

export async function TenantService_updateContract(tenantId: string, input: { contract_start_date?: string | null; contract_end_date?: string | null; contract_file_url?: string | null; contract_signed?: boolean; contract_status?: TenantContractStatus; auto_renewal?: boolean; renewal_notice_days?: number; early_termination_fee?: number | null }, updatedBy: string): Promise<void> {
  if (input.contract_start_date && input.contract_end_date && new Date(input.contract_end_date) <= new Date(input.contract_start_date)) throw new Error('Tanggal berakhir kontrak harus setelah tanggal mulai')
  if (input.renewal_notice_days !== undefined && (input.renewal_notice_days < 7 || input.renewal_notice_days > 365)) throw new Error('Periode pemberitahuan harus antara 7–365 hari')
  const ok = await tenantRepo_updateContract(tenantId, input, updatedBy)
  if (!ok) throw new Error('Gagal mengupdate informasi kontrak')
}

export async function TenantService_checkSlugAvailable(slug: string): Promise<{ available: boolean; suggestion?: string }> {
  try { validateSlug(slug) } catch { return { available: false } }
  const existing = await tenantRepo_findBySlug(slug)
  if (!existing) return { available: true }
  for (let i = 2; i <= 9; i++) {
    const candidate = `${slug}-${i}`
    const check = await tenantRepo_findBySlug(candidate)
    if (!check) return { available: false, suggestion: candidate }
  }
  return { available: false }
}

export function TenantService_formatNomorWa(nomor: string): string {
  const digits = nomor.replace(/\D/g, '')
  if (digits.startsWith('08')) return '62' + digits.slice(1)
  if (digits.startsWith('8'))  return '62' + digits
  return digits
}
