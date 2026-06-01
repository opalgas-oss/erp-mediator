// ARSIP — Sesi #230 — sebelum fix: tenant_pic_history → tenant_admintenant_history
// File asli: lib/repositories/tenant-pic.repository.ts
// Alasan arsip: RUNTIME-BREAKING — 5x .from('tenant_pic_history') perlu diupdate setelah rename tabel
// lib/repositories/tenant-pic.repository.ts
// Repository untuk tabel tenant_pic_history — akses DB only.
// TIDAK ada logika bisnis — hanya query dan return data.
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.3
//
// ARSITEKTUR:
//   Service → TenantPICRepository → DB (tabel tenant_pic_history)
//   Dipakai oleh: tenant-pic.service.ts

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  TenantPICHistory,
  PICKartu,
  PICTipe,
  GantiPICPayload,
} from '@/lib/types/tenant-pic.types'

// ─── FUNGSI: findAktifByTenantId ─────────────────────────────────────────────
export async function findAktifByTenantId(
  tenantId: string,
  tipePic: PICTipe
): Promise<TenantPICHistory | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_pic_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('tipe_pic', tipePic)
    .is('ended_at', null)
    .maybeSingle()

  if (error || !data) return null
  return data as TenantPICHistory
}

export async function findAllByTenantId(
  tenantId: string
): Promise<TenantPICHistory[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_pic_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })

  if (error || !data) return []
  return data as TenantPICHistory[]
}

export function buildKartuFromHistory(row: TenantPICHistory): PICKartu {
  return {
    id: row.id, tenant_id: row.tenant_id, user_id: row.user_id,
    user_name: row.user_name, user_email: row.user_email, user_wa: row.user_wa,
    jabatan: row.jabatan, relasi_ke_perusahaan: row.relasi_ke_perusahaan,
    tipe_pic: row.tipe_pic, started_at: row.started_at,
    sudah_aktivasi: row.user_id !== null,
  }
}

export async function updateUserIdPIC(picHistoryId: string, userId: string): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_pic_history')
    .update({ user_id: userId })
    .eq('id', picHistoryId)
  return !error
}

export async function jalankanGantiPICViaSP(payload: GantiPICPayload, changedBy: string | null = null): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_change_tenant_pic', {
    p_tenant_id: payload.tenant_id, p_new_pic_name: payload.user_name,
    p_new_pic_email: payload.user_email, p_new_pic_wa: payload.user_wa,
    p_new_pic_jabatan: payload.jabatan ?? null, p_new_pic_relasi: payload.relasi_ke_perusahaan,
    p_alasan_pergantian: payload.alasan_pergantian, p_tanggal_efektif: payload.tanggal_efektif,
    p_dokumen_serah_terima: payload.dokumen_serah_terima ?? null, p_catatan: payload.catatan ?? null,
    p_changed_by: changedBy, p_tipe_pic: payload.tipe_pic,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function hapusCadanganByTenantId(tenantId: string): Promise<{ ok: boolean; rowsAffected: number; error?: string }> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_pic_history')
    .update({ ended_at: new Date().toISOString(), alasan_pergantian: 'dihapus' })
    .eq('tenant_id', tenantId).eq('tipe_pic', 'cadangan').is('ended_at', null)
    .select('id')
  if (error) return { ok: false, rowsAffected: 0, error: error.message }
  return { ok: true, rowsAffected: data?.length ?? 0 }
}

export async function tenantPicRepo_tambahCadangan(input: { tenant_id: string; user_name: string; user_email: string; user_wa: string; jabatan: string | null; relasi_ke_perusahaan: string }, addedBy: string): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_change_tenant_pic', {
    p_tenant_id: input.tenant_id, p_new_pic_name: input.user_name, p_new_pic_email: input.user_email,
    p_new_pic_wa: input.user_wa, p_new_pic_jabatan: input.jabatan ?? null, p_new_pic_relasi: input.relasi_ke_perusahaan,
    p_alasan_pergantian: null, p_tanggal_efektif: new Date().toISOString().split('T')[0],
    p_dokumen_serah_terima: null, p_catatan: 'PIC cadangan ditambahkan', p_changed_by: addedBy, p_tipe_pic: 'cadangan',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function updateCadanganByTenantId(tenantId: string, fields: { user_name: string; user_email: string; user_wa: string; jabatan: string | null; relasi_ke_perusahaan: string }): Promise<{ ok: boolean; rowsAffected: number; error?: string }> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_pic_history')
    .update({ user_name: fields.user_name, user_email: fields.user_email, user_wa: fields.user_wa, jabatan: fields.jabatan, relasi_ke_perusahaan: fields.relasi_ke_perusahaan })
    .eq('tenant_id', tenantId).eq('tipe_pic', 'cadangan').is('ended_at', null)
    .select('id')
  if (error) return { ok: false, rowsAffected: 0, error: error.message }
  return { ok: true, rowsAffected: data?.length ?? 0 }
}
