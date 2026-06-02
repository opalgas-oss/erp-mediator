// ARSIP PRE-EDIT sesi-242-fix-bug-029-030-031-032
// File: lib/services/admin-tenant-create.service.ts
// Alasan: Fix BUG-031 — tambah INSERT ke activation_email_logs (status sent/failed)
// lib/services/admin-tenant-create.service.ts
// Service layer — buat AdminTenant baru (email BELUM terdaftar, F-REQ-01/02/07/08/09).
// Dipisah dari admin-tenant.service.ts karena orchestration kompleks (>10KB jika disatukan).
//
// ARSITEKTUR: Route → AdminTenantCreateService → Repository → DB + Auth API + Email
// Dipakai oleh: app/api/superadmin/tenants/[id]/admin-tenant/route.ts
//
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2
// Referensi: TDD_AT_AUTH_v1.md Section 5.3, FSD_AT_AUTH_v1.md Alur 6.1/6.2, 7
//
// KT-01: Hybrid transaksional — auth+profil+membership via application layer, history via SP
// KT-02: lifecycle_status='in_registration', user_memberships.status='active'
// C-01: email via Resend REST API saja (commit S#218)
// C-02: auth.users HANYA via Supabase Auth Admin API, server-only
// K-01: Gaya A — generateLink untuk link aktivasi, AT buat password sendiri
// KP-02: kontak denormalized = penanggung_jawab PERTAMA saja

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  getAktifByJabatan,
  insertHistoryAT,
} from '@/lib/repositories/admin-tenant.repository'
import { tenantRepo_updatePICDenorm } from '@/lib/repositories/tenant.repository'
import { membershipRepo_insert } from '@/lib/repositories/user-membership.repository'
import { sendResendEmail } from '@/lib/utils/resend.server'
import { getMessage, interpolate } from '@/lib/message-library'
import type {
  TambahAdminTenantPayload,
  AdminTenantJabatan,
} from '@/lib/types/admin-tenant.types'

const JABATAN_LABEL: Record<AdminTenantJabatan, string> = {
  penanggung_jawab: 'Penanggung Jawab',
  operator:         'Operator',
  finance:          'Finance',
  warehouse:        'Warehouse',
  sales:            'Sales',
  lainnya:          'Lainnya',
}

async function kirimEmailAktivasi(
  email:         string,
  nama:          string,
  jabatan:       AdminTenantJabatan,
  tenantNama:    string,
  activationUrl: string
): Promise<boolean> {
  const fallbackSubjek = `Aktivasi Akun AdminTenant — {nama_platform}`
  const fallbackBody = [
    `<p>Halo {nama_at},</p>`,
    `<p>Anda telah ditambahkan sebagai <strong>Admin Tenant</strong> ({jabatan}) di platform {nama_platform}.</p>`,
    `<p>Klik tautan berikut untuk mengaktifkan akun Anda:</p>`,
    `<p><a href="{tautan_aktivasi}">{tautan_aktivasi}</a></p>`,
    `<p>Tautan berlaku selama {durasi_jam} jam.</p>`,
    `<p>Jangan bagikan tautan ini kepada siapapun.</p>`,
  ].join('')

  const [subjekTemplate, bodyTemplate] = await Promise.all([
    getMessage('at_email_aktivasi_subjek', fallbackSubjek),
    getMessage('at_email_aktivasi_body_html', fallbackBody),
  ])

  const subjek   = interpolate(subjekTemplate, { nama_platform: tenantNama })
  const htmlBody = interpolate(bodyTemplate, {
    nama_at:         nama,
    jabatan:         JABATAN_LABEL[jabatan] ?? jabatan,
    nama_platform:   tenantNama,
    tautan_aktivasi: activationUrl,
    durasi_jam:      '24',
  })

  const result = await sendResendEmail({
    toEmail:  email,
    toNama:   nama,
    subject:  subjek,
    htmlBody,
    textBody: `Halo ${nama}, klik tautan berikut untuk aktivasi: ${activationUrl}`,
  })

  if (!result.success) {
    console.warn('[admin-tenant-create.service] kirimEmailAktivasi gagal:', result.message)
  }
  return result.success
}

async function updateKontakTenantJikaPerlu(
  tenantId:  string,
  userId:    string,
  userName:  string,
  userEmail: string,
  userWa:    string,
  jabatan:   AdminTenantJabatan,
  updatedBy: string
): Promise<void> {
  if (jabatan !== 'penanggung_jawab') return
  const existing = await getAktifByJabatan(tenantId, 'penanggung_jawab')
  if (existing && existing.user_id !== userId) return
  await tenantRepo_updatePICDenorm(
    tenantId,
    {
      current_admintenant_user_id: userId,
      admintenant_name:            userName,
      admintenant_email:           userEmail || null,
      admintenant_wa:              userWa    || null,
    },
    updatedBy
  )
}

export async function tambahAdminTenantBaru(
  payload:    TambahAdminTenantPayload,
  assignedBy: string,
  tenantNama: string
): Promise<{ ok: boolean; emailTerkirim: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const emailNormal = payload.email.toLowerCase().trim()
  const namaTrim    = payload.nama.trim()
  const waNormal    = payload.nomor_wa.replace(/\D/g, '')

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email:         emailNormal,
    email_confirm: false,
    user_metadata: { nama: namaTrim, nomor_wa: waNormal },
  })

  if (authError || !authData.user) {
    console.error('[admin-tenant-create.service] createUser gagal:', authError)
    return { ok: false, emailTerkirim: false, error: `Gagal membuat akun: ${authError?.message}` }
  }

  const userId = authData.user.id

  const { error: profileError } = await db
    .from('user_profiles')
    .insert({
      id:               userId,
      tenant_id:        payload.tenant_id,
      email:            emailNormal,
      nama:             namaTrim,
      nomor_wa:         waNormal,
      role:             'admin_tenant',
      register_status:  'approved',
      lifecycle_status: 'in_registration',
    })

  if (profileError) {
    await db.auth.admin.deleteUser(userId).catch(e =>
      console.error('[admin-tenant-create.service] deleteUser rollback gagal:', e)
    )
    return { ok: false, emailTerkirim: false, error: `Gagal buat profil: ${profileError.message}` }
  }

  try {
    await membershipRepo_insert(userId, { tenant_id: payload.tenant_id, role_id: 3 })
  } catch (membershipErr) {
    try { await db.from('user_profiles').delete().eq('id', userId) } catch { /* ignore */ }
    await db.auth.admin.deleteUser(userId).catch(() => {})
    return { ok: false, emailTerkirim: false, error: `Gagal assign membership: ${String(membershipErr)}` }
  }

  const updateKontak = payload.jabatan === 'penanggung_jawab'
  const { error: spError } = await db.rpc('sp_tambah_admintenant', {
    p_tenant_id:      payload.tenant_id,
    p_user_id:        userId,
    p_user_name:      namaTrim,
    p_user_email:     emailNormal,
    p_user_wa:        waNormal,
    p_jabatan:        payload.jabatan,
    p_relasi:         payload.relasi_ke_perusahaan,
    p_assigned_by:    assignedBy,
    p_update_kontak:  updateKontak,
  })

  if (spError) {
    console.warn('[admin-tenant-create.service] sp_tambah_admintenant gagal, fallback:', spError)
    await insertHistoryAT({
      tenant_id:            payload.tenant_id,
      user_id:              userId,
      user_name:            namaTrim,
      user_email:           emailNormal,
      user_wa:              waNormal,
      jabatan:              payload.jabatan,
      relasi_ke_perusahaan: payload.relasi_ke_perusahaan,
      assigned_by:          assignedBy,
    })
    await updateKontakTenantJikaPerlu(
      payload.tenant_id, userId, namaTrim, emailNormal, waNormal, payload.jabatan, assignedBy
    )
  }

  const { data: linkData } = await db.auth.admin.generateLink({
    type:  'recovery',
    email: emailNormal,
  })

  let emailTerkirim = false
  if (linkData?.properties?.action_link) {
    emailTerkirim = await kirimEmailAktivasi(
      emailNormal, namaTrim, payload.jabatan, tenantNama, linkData.properties.action_link
    )
  } else {
    console.warn('[admin-tenant-create.service] generateLink tidak mengembalikan action_link')
  }

  return { ok: true, emailTerkirim }
}
