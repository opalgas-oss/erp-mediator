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
// Update: Sesi #251 — fix generateLink: tambah redirectTo (camelCase) agar link tidak ke localhost
// Update: Sesi #252 — buildRedirectTo() ganti /reset-password → /aktivasi (halaman khusus AT)
// Update: Sesi #252b — ROOT CAUSE FIX: action_link pakai implicit flow (#access_token di fragment)
//   yang DITOLAK oleh @supabase/ssr (PKCE flow). Ganti: pakai properties.hashed_token → bangun URL
//   sendiri ke route server /auth/confirm-aktivasi?token_hash=...&type=recovery yang verifyOtp
//   server-side (set cookie session). Referensi: Research Supabase PKCE+generateLink S#252.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  getAktifByJabatan,
  insertHistoryAT,
} from '@/lib/repositories/admin-tenant.repository'
import { tenantRepo_updatePICDenorm } from '@/lib/repositories/tenant.repository'
import { membershipRepo_upsertActive } from '@/lib/repositories/user-membership.repository'
import { sendResendEmail } from '@/lib/utils/resend.server'
import { getMessage, interpolate } from '@/lib/message-library'
import type {
  TambahAdminTenantPayload,
  AdminTenantJabatan,
} from '@/lib/types/admin-tenant.types'

// ─── Helper: Kirim email aktivasi (F-REQ-07, C-01, K-01) ─────────────────────

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

// ─── Helper: Bangun URL aktivasi PKCE-safe (token_hash → route server) ───────
//
// PENTING: TIDAK pakai action_link dari generateLink — itu implicit flow (#access_token
// di fragment URL) yang ditolak oleh @supabase/ssr (PKCE client). Sebagai gantinya kita
// pakai properties.hashed_token + bangun URL ke route server /auth/confirm-aktivasi yang
// memanggil verifyOtp({ token_hash, type:'recovery' }) server-side → set session cookie.
//
// Path /auth/confirm-aktivasi adalah PENANDA JALUR AKTIVASI — terpisah dari reset password
// biasa (/reset-password), sehingga tidak ada collision saat fitur Lupa Password AT dibuat.

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
}

function buildAktivasiUrl(hashedToken: string): string {
  const params = new URLSearchParams({
    token_hash: hashedToken,
    type:       'recovery',
    next:       '/aktivasi',
  })
  return `${getAppUrl()}/auth/confirm-aktivasi?${params.toString()}`
}

// redirectTo untuk generateLink — fallback saja. URL aktual yang dikirim ke user
// dibangun dari hashed_token via buildAktivasiUrl(), bukan dari action_link.
function buildRedirectTo(): string {
  return `${getAppUrl()}/aktivasi`
}

// ─── Helper: Update kontak denormalized tenant (KP-02) ───────────────────────

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

  // KP-02: kontak diisi oleh penanggung_jawab PERTAMA
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

// ─── FUNGSI: tambahAdminTenantBaru ────────────────────────────────────────────
/**
 * F-REQ-01/02/07/08/09 — email BELUM terdaftar di platform.
 * NF-REQ-04: gagal sebagian → rollback sehingga tidak ada akun yatim.
 * FSD 12.3: email gagal → tidak rollback akun, log error, SA bisa retry.
 */
export async function tambahAdminTenantBaru(
  payload:    TambahAdminTenantPayload,
  assignedBy: string,
  tenantNama: string
): Promise<{ ok: boolean; emailTerkirim: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const emailNormal = payload.email.toLowerCase().trim()
  const namaTrim    = payload.nama.trim()
  const waNormal    = payload.nomor_wa.replace(/\D/g, '')

  // Step 1: Buat auth.users via Admin API (C-02: server-only, service_role)
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

  // Step 2: Insert user_profiles
  // ATURAN 41: role = 'admin_tenant' (lowercase). KT-02: lifecycle_status = 'in_registration'
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

  // Step 3: Insert user_memberships (role_id=3=admin_tenant, status=active per KT-02)
  // BUG-030 FIX S#242: pakai upsertActive — handle kasus akun re-created setelah inactive
  try {
    await membershipRepo_upsertActive(userId, payload.tenant_id, 3)
  } catch (membershipErr) {
    try { await db.from('user_profiles').delete().eq('id', userId) } catch { /* ignore */ }
    await db.auth.admin.deleteUser(userId).catch(() => {})
    return { ok: false, emailTerkirim: false, error: `Gagal assign membership: ${String(membershipErr)}` }
  }

  // Step 4: Insert history AT via SP sp_tambah_admintenant (atomik)
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

  // Step 5: Generate link aktivasi + kirim email (K-01: Gaya A — AT buat password sendiri)
  // S#252b: pakai hashed_token (PKCE-safe), BUKAN action_link (implicit flow / fragment).
  const { data: linkData } = await db.auth.admin.generateLink({
    type:    'recovery',
    email:   emailNormal,
    options: { redirectTo: buildRedirectTo() },
  })

  let emailTerkirim = false
  let emailErrorMsg: string | undefined

  if (linkData?.properties?.hashed_token) {
    const aktivasiUrl = buildAktivasiUrl(linkData.properties.hashed_token)
    emailTerkirim = await kirimEmailAktivasi(
      emailNormal, namaTrim, payload.jabatan, tenantNama, aktivasiUrl
    )
    if (!emailTerkirim) {
      emailErrorMsg = 'sendResendEmail gagal — cek RESEND_API_KEY dan domain Resend'
    }
  } else {
    emailErrorMsg = 'generateLink tidak mengembalikan hashed_token'
    console.warn('[admin-tenant-create.service]', emailErrorMsg)
  }

  // BUG-031 FIX S#242: log hasil kirim email ke activation_email_logs
  await db
    .from('activation_email_logs')
    .insert({
      entity_type:   'admin_tenant',
      entity_id:     userId,
      email_to:      emailNormal,
      email_type:    'activation',
      status:        emailTerkirim ? 'sent' : 'failed',
      error_message: emailTerkirim ? null : (emailErrorMsg ?? 'unknown error'),
    })
    .then(({ error: logErr }) => {
      if (logErr) console.error('[admin-tenant-create.service] INSERT activation_email_logs gagal:', logErr.message)
    })

  return { ok: true, emailTerkirim }
}

// ─── FUNGSI: kirimUlangAktivasi ───────────────────────────────────────────────
/**
 * K-30 Jalur 1 — SA kirim ulang email aktivasi ke AT yang masih in_registration.
 * Reuse kirimEmailAktivasi() — hanya generate ulang link + kirim.
 * Log ke activation_email_logs (insert baru, bukan update).
 */
export async function kirimUlangAktivasi(
  userId:     string,
  tenantNama: string
): Promise<{ ok: boolean; emailTerkirim: boolean; error?: string }> {
  const db = createServerSupabaseClient()

  // Ambil data AT dari user_profiles
  const { data: profile, error: profileErr } = await db
    .from('user_profiles')
    .select('email, nama, lifecycle_status')
    .eq('id', userId)
    .single()

  if (profileErr || !profile) {
    return { ok: false, emailTerkirim: false, error: 'Profil AT tidak ditemukan' }
  }

  if (profile.lifecycle_status === 'active') {
    return { ok: false, emailTerkirim: false, error: 'Akun sudah aktif — tidak perlu kirim ulang aktivasi' }
  }

  // Ambil jabatan dari tenant_admintenant_history
  const { data: histRow } = await db
    .from('tenant_admintenant_history')
    .select('jabatan')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  const jabatan = (histRow?.jabatan ?? 'lainnya') as AdminTenantJabatan

  // S#252b: pakai hashed_token (PKCE-safe), BUKAN action_link (implicit flow / fragment).
  const { data: linkData } = await db.auth.admin.generateLink({
    type:    'recovery',
    email:   profile.email,
    options: { redirectTo: buildRedirectTo() },
  })

  let emailTerkirim = false
  let emailErrorMsg: string | undefined

  if (linkData?.properties?.hashed_token) {
    const aktivasiUrl = buildAktivasiUrl(linkData.properties.hashed_token)
    emailTerkirim = await kirimEmailAktivasi(
      profile.email, profile.nama, jabatan, tenantNama, aktivasiUrl
    )
    if (!emailTerkirim) {
      emailErrorMsg = 'sendResendEmail gagal — cek credential Resend di dashboard SA Providers'
    }
  } else {
    emailErrorMsg = 'generateLink tidak mengembalikan hashed_token'
    console.warn('[admin-tenant-create.service] kirimUlangAktivasi:', emailErrorMsg)
  }

  // Log ke activation_email_logs
  await db
    .from('activation_email_logs')
    .insert({
      entity_type:   'admin_tenant',
      entity_id:     userId,
      email_to:      profile.email,
      email_type:    'activation',
      status:        emailTerkirim ? 'sent' : 'failed',
      error_message: emailTerkirim ? null : (emailErrorMsg ?? 'unknown error'),
    })
    .then(({ error: logErr }) => {
      if (logErr) console.error('[admin-tenant-create.service] INSERT activation_email_logs (ulang) gagal:', logErr.message)
    })

  return { ok: true, emailTerkirim }
}
