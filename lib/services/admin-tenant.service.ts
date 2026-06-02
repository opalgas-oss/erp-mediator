// lib/services/admin-tenant.service.ts
// Service layer — manajemen AdminTenant: tab data, cek email, tambah existing, edit, cabut akses.
// Operasi buat AT baru (email belum terdaftar) ada di admin-tenant-create.service.ts
//
// ARSITEKTUR: Route → AdminTenantService → Repository → DB
// Dipakai oleh: app/api/superadmin/tenants/[id]/admin-tenant/route.ts
//
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2
// Referensi: TDD_AT_AUTH_v1.md Section 5.3, FSD_AT_AUTH_v1.md
// ATURAN AT-2: semua operasi HANYA menyentuh tenant yang sedang diproses

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  getAktifByTenantId,
  getRiwayatByTenantId,
  cabutAksesAdminTenant,
  cekEmailTerdaftar,
  insertHistoryAT,
} from '@/lib/repositories/admin-tenant.repository'
import { membershipRepo_upsertActive } from '@/lib/repositories/user-membership.repository'
import type {
  AdminTenantHistory,
  AdminTenantKartu,
  AdminTenantTabData,
  TambahAdminTenantExistingPayload,
  EditAdminTenantPayload,
  CabutAksesAdminTenantPayload,
  CekEmailResult,
} from '@/lib/types/admin-tenant.types'

// ─── Helper: Bangun AdminTenantKartu dari History ─────────────────────────────

export function buildKartu(row: AdminTenantHistory & { lifecycle_status?: string | null }): AdminTenantKartu {
  return {
    id:                   row.id,
    tenant_id:            row.tenant_id,
    user_id:              row.user_id,
    user_name:            row.user_name,
    user_email:           row.user_email,
    user_wa:              row.user_wa,
    jabatan:              row.jabatan,
    relasi_ke_perusahaan: row.relasi_ke_perusahaan,
    started_at:           row.started_at,
    // BUG-029 FIX S#242: lifecycle_status dari user_profiles, bukan user_id !== null
    lifecycle_status:     row.lifecycle_status ?? null,
    sudah_aktivasi:       row.lifecycle_status === 'active',
  }
}

// ─── FUNGSI: getTabData ───────────────────────────────────────────────────────
/**
 * Ambil semua data untuk Tab AdminTenant (daftar aktif + riwayat).
 */
export async function getTabData(tenantId: string): Promise<AdminTenantTabData> {
  const [aktifRows, riwayatRows] = await Promise.all([
    getAktifByTenantId(tenantId),
    getRiwayatByTenantId(tenantId),
  ])

  const aktif = aktifRows.map(buildKartu)
  const adaPenanggungJawab = aktifRows.some(r => r.jabatan === 'penanggung_jawab')

  return {
    aktif,
    riwayat:        riwayatRows,
    ada_peringatan: !adaPenanggungJawab,
  }
}

// ─── FUNGSI: cekEmail ─────────────────────────────────────────────────────────
/**
 * Gerbang F-REQ-03: cek email sebelum submit form.
 */
export async function cekEmail(
  email:    string,
  tenantId: string
): Promise<CekEmailResult> {
  return cekEmailTerdaftar(email, tenantId)
}

// ─── FUNGSI: tambahAdminTenantExisting ────────────────────────────────────────
/**
 * F-REQ-05 — aksi YES saat email sudah terdaftar di platform.
 * KAIDAH MULTI-TENANT (BRD Bagian 9): HANYA tambah membership di tenant ini.
 * Tidak mengubah apapun di tenant lain atau peran lama akun existing.
 */
export async function tambahAdminTenantExisting(
  payload:    TambahAdminTenantExistingPayload,
  assignedBy: string
): Promise<{ ok: boolean; error?: string }> {
  // BUG-030 FIX S#242: pakai upsertActive — UPDATE jika row inactive ada, INSERT jika belum
  // Mencegah DUPLICATE KEY saat AT yang pernah dicabut ditambahkan kembali
  try {
    await membershipRepo_upsertActive(payload.user_id, payload.tenant_id, 3)
  } catch (err) {
    return { ok: false, error: `Gagal assign membership: ${String(err)}` }
  }

  // Insert history AT
  await insertHistoryAT({
    tenant_id:            payload.tenant_id,
    user_id:              payload.user_id,
    user_name:            '',
    user_email:           null,
    user_wa:              null,
    jabatan:              payload.jabatan,
    relasi_ke_perusahaan: payload.relasi_ke_perusahaan,
    assigned_by:          assignedBy,
  })

  return { ok: true }
}

// ─── FUNGSI: editAdminTenantProfile ───────────────────────────────────────────
/**
 * F-REQ-12 — Edit nama/WA orang yang SAMA (tidak ganti orang).
 * BUG-032 FIX S#242: tambah edit email (K-29).
 * UPDATE in-place baris history + user_profiles. Tidak buat baris history baru.
 * Jika email berubah → update auth.users + kirim ulang tautan aktivasi.
 */
export async function editAdminTenantProfile(
  payload:   EditAdminTenantPayload,
  changedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()

  const { data: historyRow, error: readError } = await db
    .from('tenant_admintenant_history')
    .select('id, user_id, tenant_id, user_email')
    .eq('id', payload.history_id)
    .is('ended_at', null)
    .maybeSingle()

  if (readError || !historyRow) {
    return { ok: false, error: 'AdminTenant tidak ditemukan atau sudah tidak aktif' }
  }

  const emailBaru = payload.email?.toLowerCase().trim() ?? null
  const emailLama = (historyRow as { user_email: string | null }).user_email
  const emailBerubah = emailBaru && emailBaru !== emailLama

  if (historyRow.user_id) {
    const updates: Record<string, unknown> = { nama: payload.user_name }
    if (payload.user_wa !== undefined) updates.nomor_wa = payload.user_wa
    if (emailBerubah)                  updates.email   = emailBaru
    await db.from('user_profiles').update(updates).eq('id', historyRow.user_id)

    // K-29: jika email berubah → update auth.users + kirim ulang tautan aktivasi
    if (emailBerubah && emailBaru) {
      await db.auth.admin.updateUserById(historyRow.user_id, { email: emailBaru }).catch(e =>
        console.error('[admin-tenant.service] updateUserById email gagal:', e)
      )

      // Generate ulang link aktivasi dan kirim email baru
      const { data: linkData } = await db.auth.admin.generateLink({ type: 'recovery', email: emailBaru })
      if (linkData?.properties?.action_link) {
        const { sendResendEmail } = await import('@/lib/utils/resend.server')
        await sendResendEmail({
          toEmail:  emailBaru,
          toNama:   payload.user_name,
          subject:  'Aktivasi Akun AdminTenant — Email Diperbarui',
          htmlBody: `<p>Halo ${payload.user_name},</p><p>Email akun Anda telah diperbarui. Klik tautan berikut untuk mengaktifkan akun Anda:</p><p><a href="${linkData.properties.action_link}">${linkData.properties.action_link}</a></p>`,
          textBody: `Halo ${payload.user_name}, klik tautan berikut untuk aktivasi: ${linkData.properties.action_link}`,
        }).catch(e => console.error('[admin-tenant.service] kirim ulang email aktivasi gagal:', e))
      }
    }
  }

  // Update history row
  const historyUpdate: Record<string, unknown> = { user_name: payload.user_name, user_wa: payload.user_wa }
  if (emailBerubah) historyUpdate.user_email = emailBaru
  await db
    .from('tenant_admintenant_history')
    .update(historyUpdate)
    .eq('id', payload.history_id)

  return { ok: true }
}

// ─── FUNGSI: cabutAkses ───────────────────────────────────────────────────────
/**
 * F-REQ-14 — Cabut akses AT eksplisit kapan saja.
 * K-22: tidak ada alert. ATURAN AT-2: HANYA menyentuh tenant ini.
 */
export async function cabutAkses(
  payload:   CabutAksesAdminTenantPayload,
  changedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()

  const { data: historyRow, error: readError } = await db
    .from('tenant_admintenant_history')
    .select('id, user_id, tenant_id')
    .eq('id', payload.history_id)
    .is('ended_at', null)
    .maybeSingle()

  if (readError || !historyRow) {
    return { ok: false, error: 'AdminTenant tidak ditemukan atau sudah tidak aktif' }
  }

  const cabutResult = await cabutAksesAdminTenant(payload.history_id, payload.alasan, changedBy)
  if (!cabutResult.ok) return { ok: false, error: cabutResult.error }

  // Set membership inactive — HANYA di tenant ini (ATURAN AT-2)
  if (historyRow.user_id) {
    await db
      .from('user_memberships')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('user_id', historyRow.user_id)
      .eq('tenant_id', historyRow.tenant_id)
      .eq('role_id', 3)
      .eq('status', 'active')

    // Update kontak tenant jika AT ini adalah kontak resmi (KP-02)
    await db
      .from('tenants')
      .update({
        current_admintenant_user_id: null,
        admintenant_name:            null,
        admintenant_email:           null,
        admintenant_wa:              null,
      })
      .eq('id', historyRow.tenant_id)
      .eq('current_admintenant_user_id', historyRow.user_id)
  }

  return { ok: true }
}
