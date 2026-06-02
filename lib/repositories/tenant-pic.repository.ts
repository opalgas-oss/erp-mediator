// lib/repositories/tenant-pic.repository.ts
// STUB — Sesi #240 STEP C
// Fungsi PIC cadangan (hapus/tambah/update/gantiPIC) sudah dihapus.
// Fungsi yang tersisa: findAktifByTenantId + findAllByTenantId + buildKartuFromHistory
// dipertahankan sementara untuk tenant-pic.service.ts (stub) sampai route change-pic dihapus.
//
// FIX T2 S#240: buildKartuFromHistory — hapus referensi row.tipe_pic (sudah DROP dari DB migration K-19)
// Referensi arsip: _arsip/coding-history/sesi-240-hutang-at-auth-step-c/tenant-pic.repository.ts

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  TenantPICHistory,
  PICKartu,
  PICTipe,
} from '@/lib/types/tenant-pic.types'

// ─── FUNGSI: findAktifByTenantId ─────────────────────────────────────────────
// Sisa sementara — dipakai oleh tenant-pic.service.ts stub

export async function findAktifByTenantId(
  tenantId: string,
  tipePic:  PICTipe
): Promise<TenantPICHistory | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_admintenant_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('jabatan', tipePic === 'utama' ? 'penanggung_jawab' : 'lainnya')
    .is('ended_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as TenantPICHistory
}

// ─── FUNGSI: findAllByTenantId ────────────────────────────────────────────────
// Sisa sementara — dipakai oleh tenant-pic.service.ts stub

export async function findAllByTenantId(
  tenantId: string
): Promise<TenantPICHistory[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_admintenant_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })

  if (error || !data) return []
  return data as TenantPICHistory[]
}

// ─── FUNGSI: buildKartuFromHistory ───────────────────────────────────────────
// FIX T2: hapus row.tipe_pic — kolom sudah di-DROP via migration K-19 S#238

export function buildKartuFromHistory(row: TenantPICHistory): PICKartu {
  return {
    id:                   row.id,
    tenant_id:            row.tenant_id,
    user_id:              row.user_id,
    user_name:            row.user_name,
    user_email:           row.user_email,
    user_wa:              row.user_wa,
    jabatan:              row.jabatan,
    relasi_ke_perusahaan: row.relasi_ke_perusahaan,
    tipe_pic:             null,           // FIX T2: kolom tipe_pic sudah DROP — hardcode null
    started_at:           row.started_at,
    sudah_aktivasi:       row.user_id !== null,
  }
}

// ─── FUNGSI: updateUserIdPIC ──────────────────────────────────────────────────
// Dipertahankan — masih mungkin dipakai sisa flow lama

export async function updateUserIdPIC(
  picHistoryId: string,
  userId:       string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_admintenant_history')
    .update({ user_id: userId })
    .eq('id', picHistoryId)

  return !error
}
