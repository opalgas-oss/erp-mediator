// lib/constants/session.constant.ts
// Konstanta nama-nama cookie session platform.
//
// Dibuat: Sesi #176 — LR-3 Opsi B: ekstrak dari duplikasi
//   Sebelumnya:
//     SESSION_COOKIES (private) di lib/auth.ts — dipakai performLogout() DEPRECATED
//     COOKIES_LOGOUT  (private) di app/auth/logout-action.ts — dipakai logoutAction() AKTIF
//   Keduanya konten identik, sinkronisasi manual — bug arsitektur.
//   Fix: satu konstanta bersama ini, diimport dari kedua file.
//
// ATURAN PENTING:
//   - Setiap cookie baru yang ditambahkan ke login flow WAJIB ditambahkan di sini
//   - File ini adalah satu-satunya sumber kebenaran nama cookie session
//   - Terdaftar di cr_constants sebagai SESSION_COOKIE_NAMES
//
// DIPAKAI OLEH:
//   - lib/auth.ts                    — performLogout() (DEPRECATED, dipertahankan rollback)
//   - app/auth/logout-action.ts      — logoutAction() (AKTIF)

// ─── SESSION_COOKIE_NAMES ─────────────────────────────────────────────────────
/**
 * Semua nama cookie session yang harus dihapus saat logout.
 * Satu-satunya sumber kebenaran — tidak boleh ada daftar cookie di file lain.
 *
 * Cookie ini di-set oleh:
 *   - setCookiesLoginServer()  → lib/app/login/login-action-helpers.ts (server-side)
 *   - setSessionCookies()      → lib/auth.ts (client-side, DEPRECATED)
 */
export const SESSION_COOKIE_NAMES = [
  'user_role',
  'tenant_id',
  'session_timeout_minutes',
  'session_last_active',
  'gps_kota',
  'session_login_at',
  'session_role',
  'session_tenant',
] as const

export type SessionCookieName = typeof SESSION_COOKIE_NAMES[number]
