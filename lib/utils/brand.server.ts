// lib/utils/brand.server.ts
// Shared utility: ambil nama brand platform per tenantId.
// Dibuat: Sesi #172 — SL-D001+K001 refactor duplikasi getNamaPlatform()
//
// LATAR BELAKANG:
//   getNamaPlatform() ditulis IDENTIK secara private di 2 service:
//     - lib/services/otp.service.ts
//     - lib/services/account-lock.service.ts
//   Keduanya melakukan hal yang sama: lookup nama_brand per tenantId untuk pesan notifikasi.
//   Dipindahkan ke sini sebagai shared utility per ATURAN 11 (DRY) + ATURAN 19.
//
// PERBEDAAN DARI getBrandName (lib/dashboard-data.ts):
//   getBrandName  → untuk sidebar dashboard, unstable_cache module-level, tidak ada tenantId param
//   getNamaBrandPlatform → untuk pesan notifikasi, per-request, support tenantId lookup spesifik
//
// ARSITEKTUR:
//   lib/utils/brand.server.ts (utility) → tenant.repository (data layer)

import 'server-only'
import {
  findNamaBrandById,
  findDefaultNamaBrand,
} from '@/lib/repositories/tenant.repository'

/**
 * Ambil nama brand platform untuk interpolasi pesan notifikasi.
 *
 * Prioritas:
 *   1. Jika tenantId ada → cari nama_brand spesifik tenant tersebut
 *   2. Fallback: ambil nama_brand dari tenant aktif pertama (default platform)
 *   3. Fallback akhir: return '' (string kosong, aman untuk interpolasi)
 *
 * Dipakai oleh: otp.service.ts (sendOTP), account-lock.service.ts (sendLockNotificationWA)
 *
 * @param tenantId - UUID tenant (opsional, boleh null)
 * @returns nama_brand string, atau '' jika tidak ditemukan
 */
export async function getNamaBrandPlatform(tenantId?: string | null): Promise<string> {
  try {
    if (tenantId) {
      const tenant = await findNamaBrandById(tenantId)
      if (tenant?.nama_brand) return tenant.nama_brand
    }
    const defaultTenant = await findDefaultNamaBrand()
    return defaultTenant?.nama_brand ?? ''
  } catch {
    return ''
  }
}
