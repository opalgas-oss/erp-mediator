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
/**
 * Ambil PIC aktif (ended_at IS NULL) untuk satu tenant.
 * Bisa untuk tipe 'utama' atau 'cadangan'.
 * @param tenantId - UUID tenant
 * @param tipePic - 'utama' | 'cadangan'
 */
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

// ─── FUNGSI: findAllByTenantId ────────────────────────────────────────────────
/**
 * Ambil seluruh riwayat PIC satu tenant (untuk timeline audit).
 * Urut terbaru dulu.
 * @param tenantId - UUID tenant
 */
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

// ─── FUNGSI: buildKartuFromHistory ───────────────────────────────────────────
/**
 * Transform row DB → PICKartu untuk tampilan kartu PIC di UI.
 * Pure function — tidak akses DB.
 */
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
    tipe_pic:             row.tipe_pic,
    started_at:           row.started_at,
    // Akun dianggap aktif jika user_id tidak null
    sudah_aktivasi:       row.user_id !== null,
  }
}

// ─── FUNGSI: updateUserIdPIC ──────────────────────────────────────────────────
/**
 * Update user_id di riwayat PIC setelah akun platform berhasil dibuat.
 * Dipanggil dari service setelah invite user selesai.
 * @param picHistoryId - ID row di tenant_pic_history
 * @param userId - UUID user yang baru dibuat
 */
export async function updateUserIdPIC(
  picHistoryId: string,
  userId: string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_pic_history')
    .update({ user_id: userId })
    .eq('id', picHistoryId)

  return !error
}

// ─── FUNGSI: jalankanGantiPICViaSP ────────────────────────────────────────────
/**
 * Eksekusi SP sp_change_tenant_pic untuk ganti PIC secara atomic.
 * Rollback otomatis jika salah satu langkah gagal (SP-level).
 * @param payload - Semua field yang dibutuhkan SP
 */
export async function jalankanGantiPICViaSP(
  payload: GantiPICPayload
): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_change_tenant_pic', {
    p_tenant_id:              payload.tenant_id,
    p_new_pic_name:           payload.user_name,
    p_new_pic_email:          payload.user_email,
    p_new_pic_wa:             payload.user_wa,
    p_new_pic_jabatan:        payload.jabatan ?? null,
    p_new_pic_relasi:         payload.relasi_ke_perusahaan,
    p_alasan_pergantian:      payload.alasan_pergantian,
    p_tanggal_efektif:        payload.tanggal_efektif,
    p_dokumen_serah_terima:   payload.dokumen_serah_terima ?? null,
    p_catatan:                payload.catatan ?? null,
    p_changed_by:             null,  // diisi di service layer dari session
    p_tipe_pic:               payload.tipe_pic,
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
