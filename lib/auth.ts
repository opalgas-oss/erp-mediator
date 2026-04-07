// lib/auth.ts
// Helper autentikasi — dipakai oleh halaman login, register, dan logout
// PENTING: ROLE_DASHBOARD di sini harus sama persis dengan di middleware.ts

// Peta role → halaman dashboard yang benar
export const ROLE_DASHBOARD: Record<string, string> = {
    CUSTOMER:       '/dashboard/customer',
    VENDOR:         '/dashboard/vendor',
    DISPATCHER:     '/dashboard/admin',
    FINANCE:        '/dashboard/admin',
    SUPPORT:        '/dashboard/admin',
    SUPER_ADMIN:    '/dashboard/admin',
    PLATFORM_OWNER: '/dashboard/owner',
  }
  
  // Simpan session ke cookie setelah login berhasil
  // max-age=3600 → cookie hidup 1 jam, sama dengan token Firebase
  export function setSessionCookies(role: string, tenantId: string): void {
    const maxAge = 60 * 60
    document.cookie =
      `session_role=${role}; path=/; max-age=${maxAge}; SameSite=Strict`
    document.cookie =
      `session_tenant=${tenantId}; path=/; max-age=${maxAge}; SameSite=Strict`
  }
  
  // Hapus session saat logout — max-age=0 langsung menghapus cookie
  export function clearSessionCookies(): void {
    document.cookie = 'session_role=; path=/; max-age=0'
    document.cookie = 'session_tenant=; path=/; max-age=0'
  }