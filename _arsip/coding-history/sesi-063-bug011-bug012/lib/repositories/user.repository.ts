// ARSIP SESI #063 — sebelum fix BUG-012
// File asli: lib/repositories/user.repository.ts
// Snapshot: 26 April 2026
// Bug: Tahap 2 select 'uid' padahal kolom PK di user_profiles adalah 'id'
// Akibat: query Tahap 2 selalu error → fall through ke Tahap 3 auth.admin.listUsers() (lambat)

import 'server-only'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ROLES } from '@/lib/constants'

export interface UserLookupResult {
  uid:       string
  email:     string
  nama:      string
  nomor_wa:  string
  role:      string
  tenant_id: string | null
  source:    'users' | 'user_profiles' | 'auth'
}

export async function findByEmail(email: string): Promise<UserLookupResult | null> {
  const db = createServerSupabaseClient()
  const { data: superadmin } = await db.from('users').select('id, email, nama, nomor_wa, role').eq('email', email).limit(1).maybeSingle()
  if (superadmin) {
    return { uid: superadmin.id, email: superadmin.email, nama: superadmin.nama ?? email, nomor_wa: superadmin.nomor_wa ?? '', role: superadmin.role ?? ROLES.SUPERADMIN, tenant_id: null, source: 'users' }
  }

  // BUG-012: select 'uid' — kolom tidak ada di user_profiles (PK = 'id')
  // Akibat: query ini selalu error, data = null, jatuh ke Tahap 3
  const { data: profile } = await db.from('user_profiles').select('uid, email, nama, nomor_wa, role, tenant_id').eq('email', email).limit(1).maybeSingle()
  if (profile) {
    return { uid: profile.uid, email: profile.email, nama: profile.nama ?? email, nomor_wa: profile.nomor_wa ?? '', role: profile.role ?? '', tenant_id: profile.tenant_id ?? null, source: 'user_profiles' }
  }

  const { data: { users: authUsers }, error: authError } = await db.auth.admin.listUsers()
  if (!authError && authUsers) {
    const authUser = authUsers.find(u => u.email === email)
    if (authUser) {
      return { uid: authUser.id, email: authUser.email ?? email, nama: (authUser.user_metadata?.nama as string) ?? email, nomor_wa: (authUser.user_metadata?.nomor_wa as string) ?? '', role: (authUser.app_metadata?.app_role as string) ?? '', tenant_id: (authUser.app_metadata?.tenant_id as string) ?? null, source: 'auth' }
    }
  }
  return null
}

export async function findSuperAdminEmail(): Promise<string | null> {
  const db = createServerSupabaseClient()
  const { data, error } = await db.from('users').select('email').eq('role', ROLES.SUPERADMIN).limit(1).single()
  if (error || !data) return null
  return data.email ?? null
}
