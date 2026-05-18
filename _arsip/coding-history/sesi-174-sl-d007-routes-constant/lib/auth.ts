// lib/auth.ts — ARSIP PRE-SL-D007 — Sesi #174
// Kondisi sebelum: ROLE_DASHBOARD didefinisikan lokal di file ini
// lib/constants/routes.constant.ts belum ada

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

// Update: Sesi #162 — T-020: tambah SESSION_DEFAULT_TIMEOUT_MINUTES sebagai konstanta bersama
//          Ganti magic number 8 * 3600 di setSessionCookies dengan konstanta ini

import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { ROLES } from '@/lib/constants'

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
// Emergency fallback: SESSION_DEFAULT_TIMEOUT_MINUTES (= 480 menit = 8 jam)
// CATATAN: Semua caller aktif selalu pass maxAgeSeconds — fallback ini adalah dead path

export function setSessionCookies(role: string, tenantId: string, maxAgeSeconds?: number): void {
  const maxAge = maxAgeSeconds ?? (SESSION_DEFAULT_TIMEOUT_MINUTES * 60)
  document.cookie = `session_role=${role}; path=/; max-age=${maxAge}; SameSite=Strict`
  document.cookie = `session_tenant=${tenantId}; path=/; max-age=${maxAge}; SameSite=Strict`
}

export async function performLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {}

  const supabase = createBrowserSupabaseClient()
  await supabase.auth.signOut()

  SESSION_COOKIES.forEach(name => {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`
  })

  window.location.href = '/login'
}

export async function clearSessionCookies(): Promise<void> {
  await performLogout()
}
