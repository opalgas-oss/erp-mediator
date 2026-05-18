// lib/services/tenant-pic.service.ts
// Service layer untuk PIC management — business logic + SP orchestration.
// Dipakai oleh: API route handlers di app/api/superadmin/tenants/[id]/change-pic
//
// ARSITEKTUR:
//   API Route → TenantPICService_* → repo (findAktifByTenantId, findAllByTenantId, buildKartuFromHistory)
//                                  → sp_change_tenant_pic (via db.rpc langsung)
//                                  → Fonnte WA (notifikasi)
//
// Dibuat: Sesi #132 — M6 FASE 3 Step 3.4
// Update: Sesi #162 — T-019: ganti hardcode pesan WA → getMessage+interpolate dari message_library
// Update: Sesi #174 — SL-D003: hapus private validateNomorWa() → import dari validation.server

import 'server-only'
import {
  findAktifByTenantId,
  findAllByTenantId,
  buildKartuFromHistory,
  hapusCadanganByTenantId,
  updateCadanganByTenantId,
} from '@/lib/repositories/tenant-pic.repository'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCredential } from '@/lib/services/credential.service'
import { getMessage, interpolate } from '@/lib/message-library'
import { sendFonnteWA } from '@/lib/utils/fonnte.server'
import { validateNomorWa } from '@/lib/utils/validation.server'
import type {
  TenantPICHistory,
  PICKartu,
  PICTimelineEntry,
  GantiPICPayload,
  TenantPICTabData,
} from '@/lib/types/tenant-pic.types'

// ─── Validation Helpers ──────────────────────────────────────────────────────

function validateTanggalEfektif(tanggal: string): void {
  const efektif = new Date(tanggal)
  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  if (efektif < today) {
    throw new Error('Tanggal efektif tidak boleh retroaktif (tidak bisa tanggal masa lalu)')
  }
}

// ─── Helper: map TenantPICHistory → PICTimelineEntry ─────────────────────────

function mapToTimelineEntry(row: TenantPICHistory): PICTimelineEntry {
  let tipe_event: PICTimelineEntry['tipe_event'] = 'awal'
  if (row.ended_at) {
    if (row.alasan_pergantian === 'resign') {
      tipe_event = 'resign'
    } else if (row.alasan_pergantian === 'dihapus') {
      tipe_event = 'cadangan_dihapus'
    } else {
      tipe_event = 'pergantian'
    }
  }

  return {
    id:            row.id,
    tipe_event,
    nama_pic:      row.user_name,
    tipe_pic:      row.tipe_pic,
    started_at:    row.started_at,
    ended_at:      row.ended_at,
    // 'dihapus' tidak ditampilkan sebagai alasan — sudah tercermin di label tipe_event
    alasan:        row.alasan_pergantian === 'dihapus' ? null : row.alasan_pergantian,
    dicatat_oleh:  row.assigned_by,
    dokumen_url:   row.dokumen_serah_terima,
  }
}

// ─── TenantPICService_getTabData ──────────────────────────────────────────────
/**
 * Ambil semua data untuk Tab PIC & Riwayat.
 */
export async function TenantPICService_getTabData(
  tenantId: string
): Promise<TenantPICTabData> {
  const [utamaRow, cadanganRow, allHistory] = await Promise.all([
    findAktifByTenantId(tenantId, 'utama'),
    findAktifByTenantId(tenantId, 'cadangan'),
    findAllByTenantId(tenantId),
  ])

  const picUtama:    PICKartu | null = utamaRow    ? buildKartuFromHistory(utamaRow)    : null
  const picCadangan: PICKartu | null = cadanganRow ? buildKartuFromHistory(cadanganRow) : null

  const timeline: PICTimelineEntry[] = allHistory
    .slice(0, 20)
    .map(mapToTimelineEntry)

  return {
    pic_utama:      picUtama,
    pic_cadangan:   picCadangan,
    timeline,
    ada_peringatan: picCadangan === null,
  }
}

// ─── TenantPICService_gantiPIC ────────────────────────────────────────────────
/**
 * Ganti PIC secara atomic via sp_change_tenant_pic.
 */
export async function TenantPICService_gantiPIC(
  input:     GantiPICPayload,
  changedBy: string
): Promise<void> {
  validateNomorWa(input.user_wa)
  validateTanggalEfektif(input.tanggal_efektif)

  if (!input.user_name.trim())    throw new Error('Nama PIC baru wajib diisi')
  if (!input.user_email.trim())   throw new Error('Email PIC baru wajib diisi')
  if (!input.alasan_pergantian)   throw new Error('Alasan pergantian wajib dipilih')

  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_change_tenant_pic', {
    p_tenant_id:            input.tenant_id,
    p_new_pic_name:         input.user_name.trim(),
    p_new_pic_email:        input.user_email.trim().toLowerCase(),
    p_new_pic_wa:           input.user_wa.replace(/\D/g, ''),
    p_new_pic_jabatan:      input.jabatan ?? null,
    p_new_pic_relasi:       input.relasi_ke_perusahaan,
    p_alasan_pergantian:    input.alasan_pergantian,
    p_tanggal_efektif:      input.tanggal_efektif,
    p_dokumen_serah_terima: input.dokumen_serah_terima ?? null,
    p_catatan:              input.catatan ?? null,
    p_changed_by:           changedBy,
    p_tipe_pic:             input.tipe_pic,
  })

  if (error) throw new Error(`Gagal mengganti PIC: ${error.message}`)

  // Kirim WA notifikasi (fire-and-forget)
  void kirimNotifikasiGantiPIC(input).catch(err =>
    console.warn('[TenantPICService] WA notifikasi gagal (non-critical):', err)
  )
}

// ─── TenantPICService_tambahCadangan ─────────────────────────────────────────
/**
 * Tambah PIC cadangan (satu form, tanpa wizard).
 */
export async function TenantPICService_tambahCadangan(
  input: {
    tenant_id:            string
    user_name:            string
    user_email:           string
    user_wa:              string
    jabatan:              string | null
    relasi_ke_perusahaan: string
  },
  addedBy: string
): Promise<void> {
  validateNomorWa(input.user_wa)
  if (!input.user_name.trim()) throw new Error('Nama PIC cadangan wajib diisi')

  const db = createServerSupabaseClient()
  const { error } = await db.rpc('sp_change_tenant_pic', {
    p_tenant_id:            input.tenant_id,
    p_new_pic_name:         input.user_name.trim(),
    p_new_pic_email:        input.user_email.trim().toLowerCase(),
    p_new_pic_wa:           input.user_wa.replace(/\D/g, ''),
    p_new_pic_jabatan:      input.jabatan ?? null,
    p_new_pic_relasi:       input.relasi_ke_perusahaan,
    p_alasan_pergantian:    null,
    p_tanggal_efektif:      new Date().toISOString().split('T')[0],
    p_dokumen_serah_terima: null,
    p_catatan:              'PIC cadangan ditambahkan',
    p_changed_by:           addedBy,
    p_tipe_pic:             'cadangan',
  })

  if (error) throw new Error(`Gagal menambah PIC cadangan: ${error.message}`)
}

// --- TenantPICService_hapusCadangan -----------------------------------------
export async function TenantPICService_hapusCadangan(
  tenantId: string
): Promise<void> {
  const result = await hapusCadanganByTenantId(tenantId)
  if (!result.ok) throw new Error(`Gagal menghapus PIC cadangan: ${result.error}`)
  if (result.rowsAffected === 0) throw new Error('Tenant ini tidak memiliki PIC cadangan aktif')
}

// --- TenantPICService_updateCadangan ----------------------------------------
export async function TenantPICService_updateCadangan(
  tenantId: string,
  input: {
    user_name:            string
    user_email:           string
    user_wa:              string
    jabatan:              string | null
    relasi_ke_perusahaan: string
  }
): Promise<void> {
  validateNomorWa(input.user_wa)
  if (!input.user_name.trim())  throw new Error('Nama PIC cadangan wajib diisi')
  if (!input.user_email.trim()) throw new Error('Email PIC cadangan wajib diisi')

  const result = await updateCadanganByTenantId(tenantId, {
    user_name:            input.user_name.trim(),
    user_email:           input.user_email.trim().toLowerCase(),
    user_wa:              input.user_wa.replace(/\D/g, ''),
    jabatan:              input.jabatan,
    relasi_ke_perusahaan: input.relasi_ke_perusahaan,
  })

  if (!result.ok) throw new Error(`Gagal memperbarui PIC cadangan: ${result.error}`)
  if (result.rowsAffected === 0) throw new Error('Tenant ini tidak memiliki PIC cadangan aktif')
}

// ─── Private: kirimNotifikasiGantiPIC ─────────────────────────────────────────
const NOTIF_WA_GANTI_PIC_FALLBACK =
  'Halo {user_name},\n\n' +
  'Anda telah ditunjuk sebagai PIC {tipe_pic} untuk tenant ini.\n' +
  'Berlaku mulai: {tanggal_efektif}\n\n' +
  'Tautan aktivasi akun akan segera dikirimkan.'

async function kirimNotifikasiGantiPIC(input: GantiPICPayload): Promise<void> {
  const apiKey = await getCredential('fonnte', 'api_token')
  if (!apiKey) return
  const template = await getMessage('notif_wa_ganti_pic', NOTIF_WA_GANTI_PIC_FALLBACK)
  const pesan    = interpolate(template, {
    user_name:       input.user_name,
    tipe_pic:        input.tipe_pic,
    tanggal_efektif: input.tanggal_efektif,
  })
  await sendFonnteWA(input.user_wa.replace(/\D/g, ''), pesan, apiKey)
}
