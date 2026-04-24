// lib/hooks/login/loginSessionHelpers.ts
// Helper functions untuk session cookie, user presence, dan activity log.
// Tidak ada React state. Pure helpers yang dipanggil dari useLoginFlow.ts.
//
// Dipecah dari lib/hooks/useLoginFlow.ts (Sesi #055 — H-03 split).
// Tujuan: memisahkan session/activity helpers dari state management.

'use client'

import { setSessionCookies, ROLE_DASHBOARD } from '@/lib/auth'
import { getDeviceInfo }                      from '@/lib/session-client'
import { ROLES }                              from '@/lib/constants'
import { fetchSessionLog, fetchActivityLog, fetchLoadUserProfile } from './loginApiCalls'
import type { ParamActivityLog }              from './loginApiCalls'

// ─── Tipe Parameter ──────────────────────────────────────────────────────────

export interface ParamAturCookieSession {
  roleDipilih:             string
  tenantId:                string
  gpsKota:                 string | null
  sessionTimeoutMinutes:   number
}

export interface ParamSelesaiLoginContext {
  uid:          string
  tenantId:     string
  nama:         string
  roleDipilih:  string
  redirectTo:   string
  gpsKotaRef:   string | null
  configLogin:  Record<string, string>
}

// ─── FUNGSI: ambilNamaSuperadmin ─────────────────────────────────────────────
/**
 * Ambil nama SUPERADMIN dari tabel users.
 * Return string kosong jika gagal (non-critical).
 * @param uidSA - UID SUPERADMIN
 * @returns Nama SUPERADMIN atau string kosong
 */
export async function ambilNamaSuperadmin(uidSA: string): Promise<string> {
  try {
    // Pakai shared function — konsisten dengan semua role lain
    // tenant_id null → API route query tabel users server-side
    const profile = await fetchLoadUserProfile(uidSA, null)
    return profile.success ? (profile.nama || '') : ''
  } catch { return '' }
}

// ─── FUNGSI: tulisSessionLogSuperadmin ───────────────────────────────────────
/**
 * Tulis session log SUPERADMIN via /api/auth/session-log.
 * @param uidSA - UID SUPERADMIN
 * @param gpsKota - Nama kota dari GPS (boleh kosong)
 * @returns sessionId yang dihasilkan, atau string kosong jika gagal
 */
export async function tulisSessionLogSuperadmin(
  uidSA:   string,
  gpsKota: string,
): Promise<string> {
  try {
    const data = await fetchSessionLog({
      uid: uidSA, tenantId: null, role: ROLES.SUPERADMIN, gpsKota,
    })
    return data.session_id ?? ''
  } catch (err) {
    console.error('[loginSessionHelpers] session log SUPERADMIN gagal:', err)
    return ''
  }
}

// ─── FUNGSI: aturCookieSession ───────────────────────────────────────────────
/**
 * Set cookie session setelah login berhasil.
 * @param params - roleDipilih, tenantId, gpsKota, sessionTimeoutMinutes
 */
export function aturCookieSession(params: ParamAturCookieSession): void {
  const maxAgeSec = params.sessionTimeoutMinutes * 60
  const loginAt   = new Date().toISOString()

  setSessionCookies(params.roleDipilih, params.tenantId, maxAgeSec)
  document.cookie = `gps_kota=${encodeURIComponent(params.gpsKota || 'Tidak Diketahui')}; path=/; max-age=${maxAgeSec}`
  document.cookie = `session_login_at=${encodeURIComponent(loginAt)}; path=/; max-age=${maxAgeSec}`
}

// ─── FUNGSI: hitungTujuanRedirect ────────────────────────────────────────────
/**
 * Tentukan URL tujuan setelah login — redirectTo atau dashboard sesuai role.
 * @param roleDipilih - Role yang dipilih user
 * @param redirectTo - URL redirect dari query param (boleh kosong)
 * @returns URL tujuan yang aman
 */
export function hitungTujuanRedirect(roleDipilih: string, redirectTo: string): string {
  if (redirectTo && redirectTo.startsWith('/')) return redirectTo
  return ROLE_DASHBOARD[roleDipilih]
    || ROLE_DASHBOARD[roleDipilih.toUpperCase()]
    || '/dashboard'
}

// ─── FUNGSI: kirimActivityLoginBerhasil ──────────────────────────────────────
/**
 * Kirim 2 activity log setelah login berhasil (fire-and-forget).
 * 1. PAGE_VIEW dengan info GPS (jika tersedia)
 * 2. FORM_SUBMIT konfirmasi login berhasil
 * @param uid, tenantId, nama, roleDipilih, sessionId, gpsKota
 */
export function kirimActivityLoginBerhasil(
  uid:         string,
  tenantId:    string,
  nama:        string,
  roleDipilih: string,
  sessionId:   string,
  gpsKota:     string | null,
): void {
  const base: Omit<ParamActivityLog, 'actionType' | 'actionDetail' | 'result'> = {
    uid, tenantId, nama, role: roleDipilih, sessionId,
    module: 'AUTH', page: '/login', pageLabel: 'Halaman Login', gpsKota: gpsKota || '',
  }

  if (gpsKota) {
    fetchActivityLog({
      ...base,
      actionType: 'PAGE_VIEW',
      actionDetail: `GPS berhasil — kota: ${gpsKota}`,
      result: 'SUCCESS',
    })
  }

  fetchActivityLog({
    ...base,
    actionType: 'FORM_SUBMIT',
    actionDetail: `Login berhasil sebagai ${roleDipilih}`,
    result: 'SUCCESS',
  })
}
