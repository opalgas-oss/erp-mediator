// lib/utils/validation.server.ts
// Shared server-side validation helpers — validasi input bisnis.
//
// Fungsi di file ini adalah pure function — tidak ada IO, tidak ada DB.
// Dipakai oleh service layer untuk validasi input sebelum operasi DB/SP.
//
// Dibuat: Sesi #174 — SL-D003+K003: ekstrak validateNomorWa dari
//         tenant.service.ts + tenant-pic.service.ts (duplikasi identik)
//
// Registry: code_registry.cr_functions
//   - validateNomorWa — SECURITY/validation — is_shared=true

import 'server-only'

// ─── validateNomorWa ──────────────────────────────────────────────────────────
/**
 * Validasi nomor WhatsApp — harus format 62xxx, panjang 10–15 digit.
 *
 * @param nomor - Nomor WA raw (boleh ada spasi, tanda hubung, tanda kurung)
 * @throws Error jika format tidak valid
 *
 * Dipakai oleh:
 *   - TenantService_create()        (lib/services/tenant.service.ts)
 *   - TenantService_update()        (lib/services/tenant.service.ts)
 *   - TenantPICService_gantiPIC()   (lib/services/tenant-pic.service.ts)
 *   - TenantPICService_tambahCadangan() (lib/services/tenant-pic.service.ts)
 *   - TenantPICService_updateCadangan() (lib/services/tenant-pic.service.ts)
 */
export function validateNomorWa(nomor: string): void {
  const clean = nomor.replace(/\D/g, '')
  if (!clean.startsWith('62') || clean.length < 10 || clean.length > 15) {
    throw new Error('Nomor WA harus format 62xxx (10–15 digit)')
  }
}
