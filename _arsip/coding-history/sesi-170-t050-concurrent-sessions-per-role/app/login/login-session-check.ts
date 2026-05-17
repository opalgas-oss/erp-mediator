// app/login/login-session-check.ts
// Helper: cek sesi paralel sebelum login selesai.
//
// Dibuat Sesi #074 — dipecah dari actions.ts (ATURAN 10).
// Berdasarkan research industri (Tokopedia, Shopee, OWASP ASVS v4):
//   Sesi paralel TIDAK diblokir — user diberi informasi + pilihan.
//   Rule 'none'              → selalu izinkan
//   Rule 'always'            → beri info jika ada sesi aktif
//   Rule 'different_role_only' → beri info hanya jika role berbeda

'use server'

import { findActiveSessions } from '@/lib/services/session.service'
import { getConfigValue }     from '@/lib/config-registry'

// ─── Tipe hasil cek sesi paralel ─────────────────────────────────────────────

export interface HasilCekSesiParalel {
  adaSesi:   boolean
  sesiData?: {
    device:   string
    gps_kota: string
    login_at: string | null
    role:     string
  }
}

// ─── FUNGSI: cekSesiParalel ──────────────────────────────────────────────────
/**
 * Cek apakah user sudah punya sesi aktif di tenant yang sama.
 * Tidak memblokir — hanya mengembalikan info sesi aktif jika ada.
 * @param uid       - UID user dari JWT
 * @param tenantId  - Tenant ID dari JWT
 * @param roleLogin - Role yang sedang login (untuk filter different_role_only)
 * @returns adaSesi: true jika perlu ditampilkan peringatan ke user
 */
export async function cekSesiParalel(
  uid:       string,
  tenantId:  string,
  roleLogin: string,
): Promise<HasilCekSesiParalel> {
  try {
    const rule = await getConfigValue('security_login', 'concurrent_rule', 'different_role_only')

    if (rule === 'none') return { adaSesi: false }

    const sessions = await findActiveSessions(uid, tenantId)
    if (sessions.length === 0) return { adaSesi: false }

    const first    = sessions[0]
    const sesiData = {
      device:   first.device   ?? '',
      gps_kota: first.gps_kota ?? '',
      login_at: first.login_at ?? null,
      role:     first.role     ?? '',
    }

    if (rule === 'always') return { adaSesi: true, sesiData }

    if (rule === 'different_role_only') {
      const roleSesiAktif  = (sesiData.role ?? '').toUpperCase()
      const roleLoginUpper = roleLogin.toUpperCase()
      if (roleSesiAktif !== roleLoginUpper) return { adaSesi: true, sesiData }
      return { adaSesi: false }
    }

    return { adaSesi: false }
  } catch {
    // Gagal cek → izinkan login (tidak boleh blokir karena error internal)
    return { adaSesi: false }
  }
}
