// lib/auth.ts
// Helper autentikasi — dipakai oleh halaman login dan semua komponen logout
//
// PERUBAHAN Sesi #047:
//   - Tambah performLogout() — satu fungsi terpusat untuk semua logout (DRY)
//     Dipakai oleh DashboardHeader, vendor/page.tsx, dan semua dashboard role berikutnya
//   - Hapus duplikasi logout logic dari komponen — cukup panggil performLogout()
//   - Gunakan window.location.href (bukan router.push) agar Supabase client cache
//     benar-benar bersih — mencegah middleware baca sesi lama dan redirect balik
// Update: Sesi #162 — T-020: tambah SESSION_DEFAULT_TIMEOUT_MINUTES sebagai konstanta bersama
//          Ganti magic number 8 * 3600 di setSessionCookies dengan konstanta ini
// Update: Sesi #174 — SL-D007: hapus ROLE_DASHBOARD lokal → re-export ROLE_TO_DASHBOARD
//          dari lib/constants/routes.constant (single source of truth)

import { createBrowserSupabaseClient } from '@/lib/supabase-client'

// ─── Re-export ROLE_DASHBOARD (backward compat) ───────────────────────────────
// loginSessionHelpers.ts masih import ROLE_DASHBOARD dari '@/lib/auth' — tetap bekerja.
// Single source of truth: lib/constants/routes.constant.ts → ROLE_TO_DASHBOARD.
export { ROLE_TO_DASHBOARD as ROLE_DASHBOARD } from '@/lib/constants/routes.constant'

// ─── Konstanta timeout sesi — satu-satunya sumber kebenaran fallback ─────────
// Dipakai sebagai emergency fallback ketika config_registry tidak dapat dibaca.
// Nilai aktual SELALU dibaca dari security_login.session_timeout_minutes di DB.
// WAJIB sinkron dengan nilai default di config_registry (keputusan Sesi #162).
export const SESSION_DEFAULT_TIMEOUT_MINUTES = 480  // 8 jam — emergency fallback only

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

// ─── Simpan cookie sesi setelah login ────────────────────────────────────────
// maxAgeSeconds dibaca dari config_registry.session_timeout_minutes — tidak hardcode
// Emergency fallback: SESSION_DEFAULT_TIMEOUT_MINUTES (= 480 menit = 8 jam)
// CATATAN: Semua caller aktif selalu pass maxAgeSeconds — fallback ini adalah dead path

export function setSessionCookies(role: string, tenantId: string, maxAgeSeconds?: number): void {
  const maxAge = maxAgeSeconds ?? (SESSION_DEFAULT_TIMEOUT_MINUTES * 60)
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
