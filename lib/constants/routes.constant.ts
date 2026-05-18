// lib/constants/routes.constant.ts
// Peta route dashboard per role — satu-satunya sumber kebenaran.
//
// Sebelumnya: ROLE_DASHBOARD di lib/auth.ts (9 entry, client-side)
//             ROLE_REDIRECT di middleware.ts (4 entry, server-side Edge Runtime)
//             Keduanya tidak sinkron — ROLE_REDIRECT hanya subset.
//
// Dibuat: Sesi #174 — SL-D007: ekstrak ke shared constant agar satu sumber kebenaran.
//
// ATURAN PENTING:
//   - File ini harus EDGE RUNTIME COMPATIBLE — tidak ada import Node.js
//   - Dipakai oleh middleware.ts (Edge Runtime) + lib/auth.ts (client) + hook login
//   - Jangan tambah import selain dari ./roles.constant

import { ROLES } from './roles.constant'

// ─── ROLE_TO_DASHBOARD ────────────────────────────────────────────────────────
/**
 * Peta role → URL dashboard. Satu-satunya sumber kebenaran di seluruh platform.
 *
 * Dipakai oleh:
 *   - middleware.ts (Edge Runtime) — server-side redirect
 *   - lib/auth.ts  (client)        — re-export sebagai ROLE_DASHBOARD (backward compat)
 *   - lib/hooks/login/loginSessionHelpers.ts — via ROLE_DASHBOARD dari auth.ts
 *
 * Tidak masuk config_registry — konstanta arsitektur terikat file system Next.js App Router.
 * (keputusan Sesi #047, dikuatkan Sesi #174)
 */
export const ROLE_TO_DASHBOARD: Record<string, string> = {
  [ROLES.SUPERADMIN]:     '/dashboard/superadmin',
  [ROLES.ADMIN_TENANT]:   '/dashboard/admin',
  [ROLES.VENDOR]:         '/dashboard/vendor',
  [ROLES.CUSTOMER]:       '/dashboard/customer',
  [ROLES.DISPATCHER]:     '/dashboard/admin',
  [ROLES.FINANCE]:        '/dashboard/admin',
  [ROLES.SUPPORT]:        '/dashboard/admin',
  [ROLES.PLATFORM_OWNER]: '/dashboard/owner',
  'SUPER_ADMIN':          '/dashboard/admin',   // legacy key — backward compat JWT lama
}
