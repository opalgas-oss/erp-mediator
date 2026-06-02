// lib/repositories/admin-tenant.repository.ts
// Repository untuk tabel tenant_admintenant_history + akses admin AT.
// TIDAK ada logika bisnis — hanya query dan return data.
//
// ARSITEKTUR:
//   Service → AdminTenantRepository → DB (tenant_admintenant_history, user_memberships, auth.users)
//   Dipakai oleh: admin-tenant.service.ts
//
// Dibuat: Sesi #239 — HUTANG-AT-AUTH STEP 2 Fase 2
// Referensi: TDD_AT_AUTH_v1.md Section 5.2, FSD_AT_AUTH_v1.md
//
// BUG-027 RESOLUTION: hapusCadanganByTenantId() DIHAPUS dari kodebase.
//   Digantikan oleh cabutAksesAdminTenant() di file ini.

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type {
  AdminTenantHistory,
  AdminTenantJabatan,
  CekEmailResult,
} from '@/lib/types/admin-tenant.types'

// ─── FUNGSI: getAktifByTenantId ───────────────────────────────────────────────
/**
 * Ambil semua AdminTenant aktif (ended_at IS NULL) untuk satu tenant.
 * Urut berdasarkan started_at paling awal (untuk KP-02: kontak resmi = yang pertama).
 * @param tenantId - UUID tenant
 */
export async function getAktifByTenantId(
  tenantId: string
): Promise<AdminTenantHistory[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_admintenant_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('ended_at', null)
    .order('started_at', { ascending: true })

  if (error || !data) return []
  return data as AdminTenantHistory[]
}

// ─── FUNGSI: getRiwayatByTenantId ─────────────────────────────────────────────
/**
 * Ambil seluruh riwayat AdminTenant untuk satu tenant (termasuk yang sudah ended).
 * Urut terbaru dulu untuk tampilan timeline audit.
 * @param tenantId - UUID tenant
 */
export async function getRiwayatByTenantId(
  tenantId: string
): Promise<AdminTenantHistory[]> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_admintenant_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })

  if (error || !data) return []
  return data as AdminTenantHistory[]
}

// ─── FUNGSI: getAktifByJabatan ────────────────────────────────────────────────
/**
 * Ambil AT aktif pertama dengan jabatan tertentu (urut started_at ASC).
 * Dipakai untuk KP-02: cek apakah tenant sudah punya penanggung_jawab aktif.
 * KP-01: TIDAK ada constraint 1-per-jabatan — bisa ada banyak, fungsi ini ambil PERTAMA.
 * @param tenantId - UUID tenant
 * @param jabatan  - jabatan yang dicari
 */
export async function getAktifByJabatan(
  tenantId: string,
  jabatan:  AdminTenantJabatan
): Promise<AdminTenantHistory | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_admintenant_history')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('jabatan', jabatan)
    .is('ended_at', null)
    .order('started_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as AdminTenantHistory
}

// ─── FUNGSI: cabutAksesAdminTenant ────────────────────────────────────────────
/**
 * Cabut akses AdminTenant: set ended_at = now + catat alasan.
 * Menggantikan hapusCadanganByTenantId() yang sudah dihapus (BUG-027 resolution).
 * ATURAN: HANYA menyentuh baris AT di tenant ini. Tidak menyentuh tenant lain.
 * @param historyId - ID baris di tenant_admintenant_history yang dicabut
 * @param alasan    - alasan cabut akses (CHECK chk_pic_alasan)
 * @param changedBy - UUID user yang melakukan pencabutan (SA atau PJ)
 */
export async function cabutAksesAdminTenant(
  historyId: string,
  alasan:    string,
  changedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_admintenant_history')
    .update({
      ended_at:          new Date().toISOString(),
      alasan_pergantian: alasan,
      assigned_by:       changedBy,
    })
    .eq('id', historyId)
    .is('ended_at', null)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ─── FUNGSI: cekEmailTerdaftar ────────────────────────────────────────────────
/**
 * Cek apakah email sudah terdaftar di platform (auth.users).
 * Dipakai sebagai gerbang F-REQ-03 sebelum create akun baru.
 *
 * PENTING (FSD 6.3): cek ke auth.users — bukan hanya user_profiles.
 * Akun existing bisa punya peran lain (Customer/Vendor) tanpa menjadi AT.
 *
 * Juga cek: apakah sudah menjadi AT aktif di tenant ini (untuk error handling F-REQ-05 / 12.5).
 * @param email    - email yang akan dicek
 * @param tenantId - tenant yang sedang diproses (untuk cek membership aktif)
 */
export async function cekEmailTerdaftar(
  email:    string,
  tenantId: string
): Promise<CekEmailResult> {
  const db = createServerSupabaseClient()

  // Cek via auth.users (admin API — service_role diperlukan)
  const { data: { users }, error: authError } = await db.auth.admin.listUsers()

  if (authError) {
    console.error('[admin-tenant.repository] cekEmailTerdaftar auth.admin.listUsers error:', authError)
    return { exists: false }
  }

  const authUser = (users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!authUser) {
    return { exists: false }
  }

  // User ada — ambil profil dan cek apakah sudah AT aktif di tenant ini
  const [profileResult, membershipResult] = await Promise.all([
    db
      .from('user_profiles')
      .select('id, nama, email, nomor_wa, role')
      .eq('id', authUser.id)
      .maybeSingle(),
    db
      .from('user_memberships')
      .select('id, status')
      .eq('user_id', authUser.id)
      .eq('tenant_id', tenantId)
      .eq('role_id', 3)        // role_id 3 = admin_tenant (verified dari DB)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const profile = profileResult.data
  const hasActiveMembership = membershipResult.data !== null

  return {
    exists:                true,
    user_id:               authUser.id,
    user_name:             profile?.nama ?? authUser.email ?? '',
    user_email:            authUser.email ?? '',
    user_wa:               profile?.nomor_wa ?? null,
    role_existing:         profile?.role ?? null,
    has_active_membership: hasActiveMembership,
  }
}

// ─── FUNGSI: insertHistoryAT ──────────────────────────────────────────────────
/**
 * Insert baris baru ke tenant_admintenant_history.
 * Dipanggil setelah auth.users + user_profiles + user_memberships berhasil dibuat/update.
 * SP sp_tambah_admintenant sudah ada — tapi dipanggil dari service, bukan langsung di sini.
 * Fungsi ini sebagai fallback INSERT langsung jika SP tidak dipakai.
 * @returns UUID id baris history baru
 */
export async function insertHistoryAT(input: {
  tenant_id:             string
  user_id:               string | null
  user_name:             string
  user_email:            string | null
  user_wa:               string | null
  jabatan:               AdminTenantJabatan
  relasi_ke_perusahaan:  string | null
  assigned_by:           string
}): Promise<string | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('tenant_admintenant_history')
    .insert({
      tenant_id:             input.tenant_id,
      user_id:               input.user_id,
      user_name:             input.user_name,
      user_email:            input.user_email,
      user_wa:               input.user_wa,
      jabatan:               input.jabatan,
      relasi_ke_perusahaan:  input.relasi_ke_perusahaan,
      started_at:            new Date().toISOString(),
      assigned_by:           input.assigned_by,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[admin-tenant.repository] insertHistoryAT error:', error)
    return null
  }
  return (data as { id: string }).id
}

// ─── FUNGSI: updateHistoryUserIdAT ────────────────────────────────────────────
/**
 * Update user_id di baris history setelah akun auth berhasil dibuat.
 * Dipakai saat insert history dibuat sebelum user_id tersedia
 * (order: history insert dulu agar SP atomik → update user_id setelah auth.admin.createUser).
 */
export async function updateHistoryUserIdAT(
  historyId: string,
  userId:    string
): Promise<boolean> {
  const db = createServerSupabaseClient()
  const { error } = await db
    .from('tenant_admintenant_history')
    .update({ user_id: userId })
    .eq('id', historyId)

  return !error
}
