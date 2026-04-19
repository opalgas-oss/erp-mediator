// lib/auth.ts
// Helper autentikasi — dipakai oleh halaman login dan logout
// PENTING: ROLE_DASHBOARD di sini harus sama persis dengan di middleware.ts
//
// PERUBAHAN dari versi Firebase:
//   - Tambah createBrowserSupabaseClient untuk dipakai di login page
//   - setSessionCookies tetap ada untuk cookie role/tenant yang dibaca middleware
//   - clearSessionCookies tambah signOut Supabase agar session benar-benar dihapus

import { createBrowserSupabaseClient } from '@/lib/supabase-client'

// Peta role → halaman dashboard yang benar
// TIDAK BERUBAH — middleware.ts harus sinkron dengan ini
export const ROLE_DASHBOARD: Record<string, string> = {
  CUSTOMER:       '/dashboard/customer',
  VENDOR:         '/dashboard/vendor',
  DISPATCHER:     '/dashboard/admin',
  FINANCE:        '/dashboard/admin',
  SUPPORT:        '/dashboard/admin',
  SUPER_ADMIN:    '/dashboard/admin',
  SUPERADMIN:     '/dashboard/superadmin',
  ADMIN_TENANT:   '/dashboard/admin',
  PLATFORM_OWNER: '/dashboard/owner',
}

// Simpan cookie role dan tenant setelah login berhasil
// maxAgeSeconds dibaca dari platform_policies.session_timeout_minutes — tidak hardcode
// Default 8 jam (28800 detik) sebagai fallback aman
export function setSessionCookies(role: string, tenantId: string, maxAgeSeconds?: number): void {
  const maxAge = maxAgeSeconds ?? (8 * 3600)
  document.cookie =
    `session_role=${role}; path=/; max-age=${maxAge}; SameSite=Strict`
  document.cookie =
    `session_tenant=${tenantId}; path=/; max-age=${maxAge}; SameSite=Strict`
}

// Hapus semua cookie session saat logout
// Supabase session cookie dihapus via signOut() — cookie role/tenant dihapus manual
export async function clearSessionCookies(): Promise<void> {
  // Hapus Supabase session
  const supabase = createBrowserSupabaseClient()
  await supabase.auth.signOut()

  // Hapus cookie role dan tenant
  document.cookie = 'session_role=; path=/; max-age=0'
  document.cookie = 'session_tenant=; path=/; max-age=0'
}