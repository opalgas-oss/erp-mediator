// lib/repositories/user.repository.ts
// Repository untuk lookup user — 3 tahap: users → user_profiles → auth.admin.
// Dibuat: Sesi #051 — BLOK B-04 TODO_ARSITEKTUR_LAYER_v1

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ROLES } from '@/lib/constants'

// ─── Tipe Data ──────────────────────────────────────────────────────────────

export interface UserLookupResult {
  uid:       string
  email:     string
  nama:      string
  nomor_wa:  string
  role:      string
  tenant_id: string | null
  source:    'users' | 'user_profiles' | 'auth'
}

// ─── Repository ─────────────────────────────────────────────────────────────

/**
 * Lookup user via 3 tahap: tabel users (SUPERADMIN) → user_profiles (Vendor/Customer) → auth.admin.
 * @param email - Email user yang dicari
 * @returns UserLookupResult dengan sumber data, null jika tidak ditemukan di manapun
 */
export async function findByEmail(email: string): Promise<UserLookupResult | null> {
  const db = createServerSupabaseClient()

  // Tahap 1: Cek di tabel users (SuperAdmin)
  const { data: superadmin } = await db
    .from('users')
    .select('id, email, nama, nomor_wa, role')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (superadmin) {
    return {
      uid:       superadmin.id,
      email:     superadmin.email,
      nama:      superadmin.nama ?? email,
      nomor_wa:  superadmin.nomor_wa ?? '',
      role:      superadmin.role ?? ROLES.SUPERADMIN,
      tenant_id: null,
      source:    'users',
    }
  }

  // Tahap 2: Cek di tabel user_profiles (Vendor, Customer, dll)
  const { data: profile } = await db
    .from('user_profiles')
    .select('uid, email, nama, nomor_wa, role, tenant_id')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (profile) {
    return {
      uid:       profile.uid,
      email:     profile.email,
      nama:      profile.nama ?? email,
      nomor_wa:  profile.nomor_wa ?? '',
      role:      profile.role ?? '',
      tenant_id: profile.tenant_id ?? null,
      source:    'user_profiles',
    }
  }

  // Tahap 3: Cek di auth.users (Supabase Auth) via admin API
  const { data: { users: authUsers }, error: authError } = await db.auth.admin.listUsers()
  if (!authError && authUsers) {
    const authUser = authUsers.find(u => u.email === email)
    if (authUser) {
      return {
        uid:       authUser.id,
        email:     authUser.email ?? email,
        nama:      (authUser.user_metadata?.nama as string) ?? email,
        nomor_wa:  (authUser.user_metadata?.nomor_wa as string) ?? '',
        role:      (authUser.app_metadata?.app_role as string) ?? '',
        tenant_id: (authUser.app_metadata?.tenant_id as string) ?? null,
        source:    'auth',
      }
    }
  }

  return null
}

/**
 * Ambil email SuperAdmin pertama dari tabel users.
 * Dipakai untuk notifikasi lock account agar user tahu harus hubungi siapa.
 * @returns Email SuperAdmin, null jika tidak ditemukan
 */
export async function findSuperAdminEmail(): Promise<string | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db
    .from('users')
    .select('email')
    .eq('role', ROLES.SUPERADMIN)
    .limit(1)
    .single()

  if (error || !data) return null
  return data.email ?? null
}
