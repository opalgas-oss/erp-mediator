// lib/auth.ts
// Helper autentikasi — dipakai oleh halaman login dan semua komponen logout
//
// PENTING: ROLE_DASHBOARD di sini harus sama persis dengan di middleware.ts
//
// PERUBAHAN Sesi #047:
//   - Tambah performLogout() — satu fungsi terpusat untuk semua logout (DRY)
//     Dipakai oleh DashboardHeader, vendor/page.tsx, dan semua dashboard role berikutnya
//   - Hapus duplikasi logout logic dari komponen — cukup panggil performLogout()
//   - Gunakan window.location.href (bukan router.push) agar Supabase client cache
//     benar-benar bersih — mencegah middleware baca sesi lama dan redirect balik

import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { ROLES } from '@/lib/constants'

// ─── Konstanta sesi ───────────────────────────────────────────────────────────

// Semua cookie yang harus dihapus saat logout
// Daftar ini satu-satunya sumber kebenaran — tidak boleh ada yang hilang
const SESSION_COOKIES = [
  'user_role',
  'tenant_id',
  'session_timeout_minutes',
  'session_last_active',
  'gps_kota',
  'session_login_at',
  'session_role',
  'session_tenant',
]

// ─── Peta role → halaman dashboard ───────────────────────────────────────────
// Konstanta arsitektur — terikat file system Next.js App Router
// TIDAK MASUK config_registry (keputusan Sesi #047 — lihat STATUS_PROJECT)
// WAJIB sinkron dengan DASHBOARD_ROLE_MAP di middleware.ts

export const ROLE_DASHBOARD: Record<string, string> = {
  [ROLES.CUSTOMER]:       '/dashboard/customer',
  [ROLES.VENDOR]:         '/dashboard/vendor',
  [ROLES.DISPATCHER]:     '/dashboard/admin',
  [ROLES.FINANCE]:        '/dashboard/admin',
  [ROLES.SUPPORT]:        '/dashboard/admin',
  SUPER_ADMIN:            '/dashboard/admin',
  [ROLES.SUPERADMIN]:     '/dashboard/superadmin',
  [ROLES.ADMIN_TENANT]:   '/dashboard/admin',
  [ROLES.PLATFORM_OWNER]: '/dashboard/owner',
}

// ─── Simpan cookie sesi setelah login ────────────────────────────────────────
// maxAgeSeconds dibaca dari config_registry.session_timeout_minutes — tidak hardcode
// Default 8 jam (28800 detik) sebagai fallback aman

export function setSessionCookies(role: string, tenantId: string, maxAgeSeconds?: number): void {
  const maxAge = maxAgeSeconds ?? (8 * 3600)
  document.cookie = `session_role=${role}; path=/; max-age=${maxAge}; SameSite=Strict`
  document.cookie = `session_tenant=${tenantId}; path=/; max-age=${maxAge}; SameSite=Strict`
}

// ─── Fungsi logout terpusat — DEPRECATED Sesi #062 ─────────────────────────
//
// @deprecated Gunakan logoutAction() dari '@/app/auth/logout-action' sebagai gantinya.
//   logoutAction() adalah server action yang menangani semua operasi logout server-side:
//   invalidasi session, hapus cookies, markLogout, setUserOffline, writeActivityLog.
//
// Semua caller sudah dimigrasikan di Sesi #062:
//   - DashboardHeader.tsx → logoutAction()
//   - app/dashboard/vendor/page.tsx → logoutAction()
//
// performLogout() dipertahankan di sini (tidak dihapus) untuk:
//   - Referensi rollback jika logoutAction() bermasalah
//   - Kompatibilitas jika ada caller di luar registry yang belum terdeteksi

export async function performLogout(): Promise<void> {
  // Langkah 1: tandai session_logs sebagai logout sebelum JWT diinvalidasi
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Gagal update session log — tetap lanjut logout
    // User harus bisa keluar meski DB sedang bermasalah
  }

  // Langkah 2: invalidasi Supabase JWT
  const supabase = createBrowserSupabaseClient()
  await supabase.auth.signOut()

  // Langkah 3: hapus semua session cookie
  SESSION_COOKIES.forEach(name => {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`
  })

  // Langkah 4: full page reload ke login
  // WAJIB window.location.href — bukan router.push
  window.location.href = '/login'
}

// ─── clearSessionCookies — dipertahankan untuk kompatibilitas ────────────────
// @deprecated Gunakan performLogout() untuk logout yang lengkap dan benar

export async function clearSessionCookies(): Promise<void> {
  await performLogout()
}
