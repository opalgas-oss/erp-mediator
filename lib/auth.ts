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

// ─── Fungsi logout terpusat — WAJIB dipakai semua komponen (DRY) ─────────────
//
// Urutan 4 langkah tidak boleh diubah:
//   1. Update session_logs di DB (JWT masih valid di langkah ini)
//   2. Invalidasi Supabase session via signOut()
//   3. Hapus semua session cookie
//   4. Full page reload ke /login (window.location.href, BUKAN router.push)
//      Alasan: router.push tidak bersihkan Supabase client cache di memory —
//      middleware akan baca cache lama dan redirect balik ke dashboard.
//
// Dipakai oleh: DashboardHeader, vendor/page.tsx, dan semua dashboard role lain.

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
