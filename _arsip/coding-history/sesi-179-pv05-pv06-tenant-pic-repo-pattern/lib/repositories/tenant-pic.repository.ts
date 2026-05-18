// lib/repositories/tenant-pic.repository.ts
// [ARSIP PRE-PV05+PV06 S#179 — kondisi sebelum fix Repository Pattern]
// jalankanGantiPICViaSP: p_changed_by hardcode null (bug)
// TenantPICService_gantiPIC + TenantPICService_tambahCadangan bypass repo, direct db.rpc di service
// tenantPicRepo_tambahCadangan belum ada

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  TenantPICHistory,
  PICKartu,
  PICTipe,
  GantiPICPayload,
} from '@/lib/types/tenant-pic.types'

export async function findAktifByTenantId(tenantId: string, tipePic: PICTipe): Promise<TenantPICHistory | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.from('tenant_pic_history').select('*').eq('tenant_id', tenantId).eq('tipe_pic', tipePic).is('ended_at', null).maybeSingle()
  if (error || !data) return null
  return data as TenantPICHistory
}

export async function findAllByTenantId(tenantId: string): Promise<TenantPICHistory[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.from('tenant_pic_history').select('*').eq('tenant_id', tenantId).order('started_at', { ascending: false })
  if (error || !data) return []
  return data as TenantPICHistory[]
}

export function buildKartuFromHistory(row: TenantPICHistory): PICKartu {
  return { id: row.id, tenant_id: row.tenant_id, user_id: row.user_id, user_name: row.user_name, user_email: row.user_email, user_wa: row.user_wa, jabatan: row.jabatan, relasi_ke_perusahaan: row.relasi_ke_perusahaan, tipe_pic: row.tipe_pic, started_at: row.started_at, sudah_aktivasi: row.user_id !== null }
}

export async function updateUserIdPIC(picHistoryId: string, userId: string): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db.from('tenant_pic_history').update({ user_id: userId }).eq('id', picHistoryId)
  return !error
}

export async function jalankanGantiPICViaSP(payload: GantiPICPayload): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_change_tenant_pic', {
    p_tenant_id: payload.tenant_id, p_new_pic_name: payload.user_name, p_new_pic_email: payload.user_email,
    p_new_pic_wa: payload.user_wa, p_new_pic_jabatan: payload.jabatan ?? null, p_new_pic_relasi: payload.relasi_ke_perusahaan,
    p_alasan_pergantian: payload.alasan_pergantian, p_tanggal_efektif: payload.tanggal_efektif,
    p_dokumen_serah_terima: payload.dokumen_serah_terima ?? null, p_catatan: payload.catatan ?? null,
    p_changed_by: null, p_tipe_pic: payload.tipe_pic,  // BUG: null hardcode — seharusnya terima changedBy
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function hapusCadanganByTenantId(tenantId: string): Promise<{ ok: boolean; rowsAffected: number; error?: string }> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.from('tenant_pic_history').update({ ended_at: new Date().toISOString(), alasan_pergantian: 'dihapus' }).eq('tenant_id', tenantId).eq('tipe_pic', 'cadangan').is('ended_at', null).select('id')
  if (error) return { ok: false, rowsAffected: 0, error: error.message }
  return { ok: true, rowsAffected: data?.length ?? 0 }
}

export async function updateCadanganByTenantId(tenantId: string, fields: { user_name: string; user_email: string; user_wa: string; jabatan: string | null; relasi_ke_perusahaan: string }): Promise<{ ok: boolean; rowsAffected: number; error?: string }> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.from('tenant_pic_history').update({ user_name: fields.user_name, user_email: fields.user_email, user_wa: fields.user_wa, jabatan: fields.jabatan, relasi_ke_perusahaan: fields.relasi_ke_perusahaan }).eq('tenant_id', tenantId).eq('tipe_pic', 'cadangan').is('ended_at', null).select('id')
  if (error) return { ok: false, rowsAffected: 0, error: error.message }
  return { ok: true, rowsAffected: data?.length ?? 0 }
}
